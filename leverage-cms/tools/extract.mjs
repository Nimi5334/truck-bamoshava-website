#!/usr/bin/env node
/**
 * Onboarding scaffolder — jump-starts making a hand-built static site editable.
 *
 * Usage:  node leverage-cms/tools/extract.mjs <siteDir>
 *
 * Reads <siteDir>/index.html and writes a DRAFT <siteDir>/content/site.json
 * with the parts that can be parsed reliably (meta, theme tokens, brand) and a
 * scaffold of detected sections. It does NOT rewrite index.html into
 * template.html — that step is a careful manual pass (see ONBOARDING.md),
 * because turning bespoke markup into render() sections needs human judgement.
 *
 * Treat the output as a starting point to edit, not a finished model.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const siteDir = process.argv[2];
if (!siteDir) {
  console.error("Usage: node extract.mjs <siteDir>");
  process.exit(1);
}
const dir = resolve(process.cwd(), siteDir);
const html = readFileSync(join(dir, "index.html"), "utf8");

const pick = (re, group = 1) => (html.match(re) || [])[group] || "";

// ---- meta ----
const meta = {
  lang: pick(/<html[^>]*\blang="([^"]*)"/i) || "en",
  dir: pick(/<html[^>]*\bdir="([^"]*)"/i) || "ltr",
  title: pick(/<title>([\s\S]*?)<\/title>/i).trim(),
  description: pick(/<meta\s+name="description"\s+content="([^"]*)"/i),
  favicon: pick(/<link[^>]*rel="icon"[^>]*href="([^"]*)"/i),
  themeColor: pick(/<meta\s+name="theme-color"\s+content="([^"]*)"/i),
  fontsHref: pick(/<link[^>]*href="(https:\/\/fonts\.googleapis\.com[^"]*)"/i),
};

// ---- theme tokens (best-effort from :root custom properties) ----
const rootBlock = pick(/:root\s*\{([\s\S]*?)\}/);
const vars = {};
for (const m of rootBlock.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1].trim()] = m[2].trim();
// map common token names -> our colors keys
const map = { bg: "bg", "bg-deep": "bgDeep", surface: "surface", ink: "ink", "ink-soft": "inkSoft", sage: "sage", "sage-deep": "sageDeep", "sage-dark": "sageDark", olive: "olive", line: "line" };
const colors = {};
for (const [css, key] of Object.entries(map)) if (vars[css] && /^#/.test(vars[css])) colors[key] = vars[css];
const theme = {
  colors,
  radius: vars["radius"] || "12px",
  fonts: { head: vars["font-head"] || '"Assistant",sans-serif', body: vars["font-body"] || '"Assistant",sans-serif' },
};

// ---- brand guess ----
const brand = {
  name: pick(/<a[^>]*class="[^"]*brand[^"]*"[\s\S]*?<span>([^<]*)<\/span>/i) || meta.title.split(/[|·\-]/)[0].trim(),
  logo: pick(/<a[^>]*class="[^"]*brand[^"]*"[\s\S]*?<img[^>]*src="([^"]*)"/i),
};

// ---- detect section types present (by signature) ----
const detectors = [
  ["hero", /class="[^"]*\bhero\b/],
  ["richtext", /class="[^"]*\bstory\b/],
  ["menu", /class="[^"]*\bmenu-cat\b/],
  ["media", /class="[^"]*\bphoto-band\b/],
  ["locations", /class="[^"]*\blocations\b/],
  ["social", /class="[^"]*\bsocial-row\b/],
];
const detected = detectors.filter(([, re]) => re.test(html)).map(([t]) => t);
const sections = detected.map((type, i) => ({ id: type === "hero" ? "top" : type, type, visible: true, data: {} }));

const draft = {
  schemaVersion: 1,
  siteId: siteDir.split(/[\\/]/).filter(Boolean).pop(),
  meta,
  theme,
  brand,
  nav: { links: [], cta: { label: "", href: "#" } },
  sections,
  footer: { logo: brand.logo, links: [], copyright: "", regions: "" },
};

const outDir = join(dir, "content");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "site.draft.json");
writeFileSync(outPath, JSON.stringify(draft, null, 2) + "\n", "utf8");

console.log(`[extract] wrote ${join(siteDir, "content", "site.draft.json")}`);
console.log(`[extract] detected sections: ${detected.join(", ") || "(none)"}`);
console.log("\nNext steps (see leverage-cms/ONBOARDING.md):");
console.log("  1. Fill in each section's `data` from the real markup.");
console.log("  2. Copy index.html -> template.html and replace the dynamic");
console.log("     regions with {{TITLE}}, {{TOKENS}}, {{HEADER}}, {{SECTIONS}},");
console.log("     {{FOOTER}}, {{HOURS_JSON}} (see truck-bamoshava/template.html).");
console.log("  3. Rename site.draft.json -> site.json and run render.mjs.");
console.log("  4. Diff the rendered index.html against the original (equivalence gate).");
