#!/usr/bin/env node
/**
 * One-time setup: encrypts the GitHub OAuth token with the client's password
 * and writes the site config for the admin panel.
 *
 * Usage (run once per site):
 *   node leverage-cms/tools/setup.mjs <siteId> <password> [ghToken]
 *
 * If ghToken is omitted, reads it from git-credential-manager.
 * Writes leverage-cms/admin/sites/<siteId>.json with the encrypted token.
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [, , siteId, password, explicitToken] = process.argv;
if (!siteId || !password) {
  console.error("Usage: node setup.mjs <siteId> <password> [ghToken]");
  process.exit(1);
}

// Resolve the GitHub token
let ghToken = explicitToken;
if (!ghToken) {
  try {
    const out = execSync(
      'printf "protocol=https\\nhost=github.com\\n" | "E:/Git/mingw64/bin/git-credential-manager.exe" get 2>/dev/null',
      { encoding: "utf8", shell: "bash" }
    );
    ghToken = out.match(/password=(.+)/)?.[1]?.trim();
  } catch {
    console.error("Could not read token from git-credential-manager. Pass it as 3rd argument.");
    process.exit(1);
  }
}
if (!ghToken) { console.error("No token found."); process.exit(1); }

// Encrypt ghToken with AES-256-GCM using PBKDF2(password, randomSalt).
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"]
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(ghToken));

const b64 = (b) => {
  const arr = new Uint8Array(b);
  let s = "";
  for (const c of arr) s += String.fromCharCode(c);
  return btoa(s);
};

const here = dirname(fileURLToPath(import.meta.url));
const sitesDir = join(here, "../admin/sites");
if (!existsSync(sitesDir)) mkdirSync(sitesDir, { recursive: true });

const config = {
  siteId,
  repo: "Nimi5334/truck-bamoshava-website",
  branch: "main",
  contentPath: `${siteId}/content/site.json`,
  uploadsPath: `${siteId}/assets`,
  dispatchWorkflow: "cms-write.yml",
  // The encrypted token: salt + iv + ciphertext, each base64.
  encryptedToken: { salt: b64(salt), iv: b64(iv), ct: b64(cipherBuf) },
};

const outPath = join(sitesDir, `${siteId}.json`);
writeFileSync(outPath, JSON.stringify(config, null, 2) + "\n");
console.log(`[setup] wrote ${outPath}`);
console.log(`[setup] admin URL: https://nimi5334.github.io/truck-bamoshava-website/_cms/?site=${siteId}`);
console.log(`[setup] client password: ${password}`);
console.log("[setup] KEEP THE PASSWORD SAFE — share it with the client via a secure channel.");
