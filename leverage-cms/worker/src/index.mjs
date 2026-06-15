/**
 * Leverage CMS — auth + commit Worker.
 *
 * One Worker serves every client site. It:
 *   - authenticates a client with a per-site password -> short-lived JWT,
 *   - reads/writes that site's content/site.json on GitHub,
 *   - accepts image uploads into the site's uploads folder,
 * all without ever exposing a GitHub token to the browser.
 *
 * The repo/path a request may touch is resolved ONLY from the KV registry
 * keyed by the JWT's siteId — never from anything the browser sends — so a
 * forged ?site= or body.siteId cannot reach another client's repo.
 *
 * Bindings (wrangler.toml):
 *   KV:      CLIENTS, RATE
 *   Secrets: GH_APP_ID, GH_APP_PRIVATE_KEY, JWT_SIGNING_SECRET
 *   Vars:    ALLOWED_ORIGIN
 */
import { signSessionJWT, verifySessionJWT, verifyPassword } from "./crypto.mjs";
import { validateSite } from "./validate.mjs";
import { getInstallationToken, getFile, putFile } from "./github.mjs";

const COMMIT_AUTHOR = { name: "Leverage CMS", email: "cms@leverage.local" };
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const RATE_LIMIT = { max: 30, windowSec: 60 }; // per site+IP per minute

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), env, origin);

    try {
      const route = `${request.method} ${url.pathname}`;
      let res;
      if (route === "GET /health") res = json({ ok: true });
      else if (route === "POST /auth/login") res = await handleLogin(request, env);
      else if (route === "GET /content") res = await handleGetContent(request, env);
      else if (route === "PUT /content") res = await handlePutContent(request, env);
      else if (route === "POST /upload") res = await handleUpload(request, env);
      else res = json({ error: "not found" }, 404);
      return cors(res, env, origin);
    } catch (err) {
      return cors(json({ error: "internal", detail: String(err?.message || err) }, 500), env, origin);
    }
  },
};

/* ------------------------------------------------------------------ */
/* handlers                                                            */
/* ------------------------------------------------------------------ */
async function handleLogin(request, env) {
  const body = await readJson(request);
  if (!body || typeof body.siteId !== "string" || typeof body.password !== "string")
    return json({ error: "siteId and password required" }, 400);

  const client = await getClient(env, body.siteId);
  // Constant-ish path whether or not the client exists (avoid enumeration).
  const stored = client?.login?.passwordHash || "pbkdf2$210000$AAAA$AAAA";
  const ok = (await verifyPassword(body.password, stored)) && !!client;
  if (!ok) return json({ error: "invalid credentials" }, 401);

  const token = await signSessionJWT({ siteId: body.siteId, scope: "edit" }, env.JWT_SIGNING_SECRET);
  return json({ token, siteId: body.siteId, expiresInSec: 60 * 60 * 12 });
}

async function handleGetContent(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const { client, siteId } = auth;
  const rl = await rateLimit(env, siteId, clientIp(request));
  if (rl) return rl;

  const token = await getInstallationToken(env, client.installationId);
  const file = await getFile(token, client.repo, client.contentPath, client.branch);
  if (!file) return json({ error: "content not found" }, 404);
  let content;
  try {
    content = JSON.parse(file.text);
  } catch {
    return json({ error: "stored content is not valid JSON" }, 500);
  }
  return json({ siteId, content, sha: file.sha });
}

async function handlePutContent(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const { client, siteId } = auth;
  const rl = await rateLimit(env, siteId, clientIp(request));
  if (rl) return rl;

  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "body required" }, 400);
  const content = body.content;
  const sha = body.sha; // required for safe update (optimistic concurrency)

  const result = validateSite(content);
  if (!result.ok) return json({ error: "validation failed", errors: result.errors }, 422);

  // Cross-tenant guard: a payload claiming another siteId is rejected.
  if (content.siteId && content.siteId !== siteId)
    return json({ error: "siteId mismatch" }, 403);

  const token = await getInstallationToken(env, client.installationId);
  const pretty = JSON.stringify(content, null, 2) + "\n";
  const put = await putFile(
    token,
    client.repo,
    client.contentPath,
    client.branch,
    pretty,
    `cms(${siteId}): update content`,
    sha,
    COMMIT_AUTHOR
  );
  if (put.conflict)
    return json({ error: "conflict", message: "content changed since you loaded it; reload and retry" }, 409);
  if (!put.ok) return json({ error: "commit failed", detail: put.detail }, 502);
  return json({ ok: true, commit: put.commit, sha: put.contentSha, liveInSec: 90 });
}

async function handleUpload(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const { client, siteId } = auth;
  const rl = await rateLimit(env, siteId, clientIp(request));
  if (rl) return rl;

  const body = await readJson(request);
  if (!body || typeof body.filename !== "string" || typeof body.dataBase64 !== "string")
    return json({ error: "filename and dataBase64 required" }, 400);
  if (!ALLOWED_IMAGE_TYPES.has(body.contentType))
    return json({ error: "unsupported image type" }, 415);

  let bytes;
  try {
    bytes = Uint8Array.from(atob(body.dataBase64), (c) => c.charCodeAt(0));
  } catch {
    return json({ error: "dataBase64 is not valid base64" }, 400);
  }
  if (bytes.length > MAX_IMAGE_BYTES)
    return json({ error: `image too large (> ${MAX_IMAGE_BYTES} bytes)` }, 413);

  const safe = sanitizeFilename(body.filename);
  const path = `${client.uploadsPath.replace(/\/$/, "")}/${safe}`;
  const token = await getInstallationToken(env, client.installationId);
  const existing = await getFile(token, client.repo, path, client.branch);
  const put = await putFile(
    token,
    client.repo,
    path,
    client.branch,
    bytes,
    `cms(${siteId}): upload ${safe}`,
    existing?.sha,
    COMMIT_AUTHOR
  );
  if (!put.ok) return json({ error: "upload failed", detail: put.detail }, 502);
  // relPath is the path as referenced inside site.json (relative to index.html,
  // i.e. the site root = common dir of the content + uploads paths).
  return json({ ok: true, path, relPath: siteRelative(client.contentPath, path), commit: put.commit });
}

/**
 * Path of `repoPath` as referenced inside site.json (relative to index.html).
 * Convention: content lives at <siteRoot>/content/site.json and index.html at
 * <siteRoot>/, so the site root is contentPath minus its last two segments.
 */
function siteRelative(contentPath, repoPath) {
  const root = contentPath.split("/").slice(0, -2).join("/");
  if (root && repoPath.startsWith(root + "/")) return repoPath.slice(root.length + 1);
  return repoPath;
}

/* ------------------------------------------------------------------ */
/* auth + registry                                                    */
/* ------------------------------------------------------------------ */
async function requireAuth(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = await verifySessionJWT(token, env.JWT_SIGNING_SECRET);
  if (!payload || !payload.siteId) return { error: json({ error: "unauthorized" }, 401) };
  const client = await getClient(env, payload.siteId);
  if (!client) return { error: json({ error: "unknown site" }, 401) };
  return { client, siteId: payload.siteId };
}

async function getClient(env, siteId) {
  // Registry keyed by siteId. value: {repo, branch, contentPath, uploadsPath, installationId, login}
  const raw = await env.CLIENTS.get(siteId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* rate limiting                                                      */
/* ------------------------------------------------------------------ */
async function rateLimit(env, siteId, ip) {
  if (!env.RATE) return null; // optional binding
  const key = `${siteId}:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const raw = await env.RATE.get(key);
  let rec = raw ? JSON.parse(raw) : { count: 0, start: now };
  if (now - rec.start >= RATE_LIMIT.windowSec) rec = { count: 0, start: now };
  rec.count++;
  await env.RATE.put(key, JSON.stringify(rec), { expirationTtl: RATE_LIMIT.windowSec + 5 });
  if (rec.count > RATE_LIMIT.max) return json({ error: "rate limited, slow down" }, 429);
  return null;
}

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */
function sanitizeFilename(name) {
  const base = name.split(/[\\/]/).pop() || "file";
  return base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "file";
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cors(res, env, origin) {
  const allowed = env.ALLOWED_ORIGIN || "";
  // Exact-match the configured admin origin; never reflect arbitrary origins.
  const allowOrigin = allowed && origin === allowed ? origin : allowed;
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", allowOrigin || "null");
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  h.set("Access-Control-Max-Age", "86400");
  return new Response(res.body, { status: res.status, headers: h });
}
