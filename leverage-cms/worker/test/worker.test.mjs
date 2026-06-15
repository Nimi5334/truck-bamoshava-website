/**
 * Unit tests for the Worker's pure logic — runnable under Node (Web Crypto
 * and fetch are global in Node >= 18). These cover the security-critical
 * pieces without needing a live deploy:
 *   - JWT round-trip + tamper/expiry rejection
 *   - PBKDF2 hash + verify (right/wrong password)
 *   - schema validation: the real site.json passes; XSS / cross-tenant /
 *     oversized / bad-enum payloads are rejected.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { signSessionJWT, verifySessionJWT, hashPassword, verifyPassword } from "../src/crypto.mjs";
import { validateSite } from "../src/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = JSON.parse(
  readFileSync(join(here, "../../../truck-bamoshava/content/site.json"), "utf8")
);
const SECRET = "test-signing-secret-please-change";

test("JWT round-trips and carries siteId", async () => {
  const t = await signSessionJWT({ siteId: "truck-bamoshava", scope: "edit" }, SECRET);
  const p = await verifySessionJWT(t, SECRET);
  assert.equal(p.siteId, "truck-bamoshava");
  assert.equal(p.scope, "edit");
});

test("JWT signed with another secret is rejected", async () => {
  const t = await signSessionJWT({ siteId: "a" }, SECRET);
  assert.equal(await verifySessionJWT(t, "different-secret"), null);
});

test("expired JWT is rejected", async () => {
  const t = await signSessionJWT({ siteId: "a" }, SECRET, -10);
  assert.equal(await verifySessionJWT(t, SECRET), null);
});

test("tampered JWT payload is rejected", async () => {
  const t = await signSessionJWT({ siteId: "a" }, SECRET);
  const [h, , s] = t.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ siteId: "b", exp: 9e9 }))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  assert.equal(await verifySessionJWT(`${h}.${forgedPayload}.${s}`, SECRET), null);
});

test("password hash verifies correct password and rejects wrong one", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("the real site.json passes validation", () => {
  const r = validateSite(SITE);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("XSS attempt in a paragraph still validates (escaped at render) but stays plain text", () => {
  // Plain text is allowed; the defense is that render.mjs escapes it.
  const evil = structuredClone(SITE);
  const story = evil.sections.find((s) => s.type === "richtext");
  story.data.paragraphs[0] = '<script>alert(1)</script>';
  const r = validateSite(evil);
  assert.equal(r.ok, true); // accepted as text...
  assert.equal(r.value.sections.find((s) => s.type === "richtext").data.paragraphs[0],
    "<script>alert(1)</script>"); // ...stored verbatim, never as markup
});

test("invalid dietary tag is rejected", () => {
  const bad = structuredClone(SITE);
  const menu = bad.sections.find((s) => s.type === "menu");
  menu.data.categories[0].groups[0].items[0].tags = ["evil"];
  const r = validateSite(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("invalid tag")));
});

test("non-hex theme color is rejected", () => {
  const bad = structuredClone(SITE);
  bad.theme.colors.bg = "javascript:alert(1)";
  const r = validateSite(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("hex color")));
});

test("disallowed href scheme is rejected", () => {
  const bad = structuredClone(SITE);
  bad.nav.links[0].href = "javascript:alert(1)";
  const r = validateSite(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("allowed URL")));
});

test("unknown section type is rejected", () => {
  const bad = structuredClone(SITE);
  bad.sections.push({ id: "x", type: "iframe", visible: true, data: {} });
  const r = validateSite(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("not allowed")));
});

test("oversized payload is rejected", () => {
  const bad = structuredClone(SITE);
  const menu = bad.sections.find((s) => s.type === "menu");
  // Inflate well past the 512KB cap.
  menu.data.categories[0].groups[0].items[0].desc = "x".repeat(600 * 1024);
  const r = validateSite(bad);
  assert.equal(r.ok, false);
});
