#!/usr/bin/env node
/**
 * Local dev harness for the admin panel.
 *
 * Implements the Worker API (login / content / upload) against the local
 * filesystem instead of GitHub, and serves the admin SPA + the pilot site so
 * the whole editor (incl. live preview and image upload) can be exercised
 * end-to-end without deploying anything.
 *
 * Usage:
 *   node leverage-cms/tools/dev-mock.mjs
 *   open  http://localhost:8799/admin/?site=truck-bamoshava&worker=http://localhost:8799&tpl=http://localhost:8799/site/template.html
 *
 * Login password for the mock: "demo".
 * NOTE: dev only — auth is a stub, edits write straight to local files.
 */
import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { validateSite } from "../worker/src/validate.mjs";

const ROOT = resolve(process.cwd());
const CMS_DIR = join(ROOT, "leverage-cms");
const SITE_DIR = join(ROOT, "truck-bamoshava");
const CONTENT = join(SITE_DIR, "content", "site.json");
const PORT = 8799;
const PASSWORD = "demo";
const TOKEN = "dev-token";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".gif": "image/gif" };

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", ...headers });
  res.end(body);
};
const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": "application/json" });
const readBody = (req) => new Promise((r) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => r(b)); });
let fakeSha = "sha-" + Date.now();

async function serveStatic(res, filePath) {
  try {
    const data = await readFile(filePath);
    send(res, 200, data, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
  } catch {
    send(res, 404, "not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (req.method === "OPTIONS") return send(res, 204, "");

  // ---- API ----
  if (p === "/auth/login" && req.method === "POST") {
    const { siteId, password } = JSON.parse((await readBody(req)) || "{}");
    if (password !== PASSWORD) return sendJson(res, 401, { error: "invalid credentials" });
    return sendJson(res, 200, { token: TOKEN, siteId: siteId || "truck-bamoshava", expiresInSec: 60 * 60 * 12 });
  }
  if (p === "/content" && req.method === "GET") {
    const content = JSON.parse(await readFile(CONTENT, "utf8"));
    return sendJson(res, 200, { content, sha: fakeSha });
  }
  if (p === "/content" && req.method === "PUT") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const v = validateSite(body.content);
    if (!v.ok) return sendJson(res, 422, { error: "validation failed", errors: v.errors });
    await writeFile(CONTENT, JSON.stringify(body.content, null, 2) + "\n", "utf8");
    fakeSha = "sha-" + Date.now();
    // Re-render index.html locally so refreshing the live preview shows it.
    const { render } = await import("../templates/render.mjs");
    const tpl = await readFile(join(SITE_DIR, "template.html"), "utf8");
    await writeFile(join(SITE_DIR, "index.html"), render(body.content, tpl), "utf8");
    return sendJson(res, 200, { ok: true, commit: fakeSha, sha: fakeSha });
  }
  if (p === "/upload" && req.method === "POST") {
    const { filename, dataBase64 } = JSON.parse((await readBody(req)) || "{}");
    const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
    await writeFile(join(SITE_DIR, "assets", safe), Buffer.from(dataBase64, "base64"));
    return sendJson(res, 200, { ok: true, path: `truck-bamoshava/assets/${safe}`, relPath: `assets/${safe}` });
  }
  if (p === "/health") return sendJson(res, 200, { ok: true });

  // ---- static ----
  // Mirror the production publish layout (_cms/ with templates/ alongside the
  // admin) so the admin's `import("./templates/render.mjs")` resolves here too.
  if (p.startsWith("/site/")) return serveStatic(res, join(SITE_DIR, p.slice("/site/".length)));
  if (p === "/" || p === "/admin" || p === "/admin/") return serveStatic(res, join(CMS_DIR, "admin", "index.html"));
  if (p.startsWith("/admin/templates/")) return serveStatic(res, join(CMS_DIR, "templates", p.slice("/admin/templates/".length)));
  if (p.startsWith("/admin/")) return serveStatic(res, join(CMS_DIR, "admin", p.slice("/admin/".length)));
  return serveStatic(res, join(CMS_DIR, p.replace(/^\//, "")));
});

server.listen(PORT, () => {
  const q = `?site=truck-bamoshava&worker=http://localhost:${PORT}&tpl=http://localhost:${PORT}/site/template.html`;
  console.log(`[dev-mock] http://localhost:${PORT}/admin/${q}`);
  console.log(`[dev-mock] login password: ${PASSWORD}`);
});
