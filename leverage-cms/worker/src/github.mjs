/**
 * Minimal GitHub App + Contents API client.
 *
 * The Worker holds the App private key (a secret env var) and mints a
 * short-lived installation token per request. Tokens are scoped to a single
 * installation (one client's repo) and expire automatically — so a leaked
 * token is far less dangerous than a broad personal access token.
 */
import { signAppJWT, b64Encode } from "./crypto.mjs";

const API = "https://api.github.com";
const UA = "leverage-cms-worker";

// Per-isolate cache of installation tokens (installationId -> {token, exp}).
const tokenCache = new Map();

async function gh(path, { method = "GET", token, appJwt, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": UA,
      Authorization: `Bearer ${token || appJwt}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export async function getInstallationToken(env, installationId) {
  const cached = tokenCache.get(installationId);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;

  const appJwt = await signAppJWT(env.GH_APP_ID, env.GH_APP_PRIVATE_KEY);
  const res = await gh(`/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    appJwt,
  });
  if (!res.ok) {
    throw new Error(`installation token failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const exp = Math.floor(new Date(data.expires_at).getTime() / 1000);
  tokenCache.set(installationId, { token: data.token, exp });
  return data.token;
}

/** Read a file. Returns { sha, text } or null if missing. */
export async function getFile(token, repo, path, branch) {
  const res = await gh(
    `/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
    { token }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getFile ${path}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.content
    ? new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, "")), (c) => c.charCodeAt(0)))
    : "";
  return { sha: data.sha, text };
}

/**
 * Create or update a file. `contentBytes` is a Uint8Array (or string).
 * Pass `sha` for updates (GitHub enforces optimistic concurrency: a stale
 * sha yields 409). Returns { ok, status, commit, contentSha } / 409 details.
 */
export async function putFile(token, repo, path, branch, contentBytes, message, sha, author) {
  const bytes =
    typeof contentBytes === "string" ? new TextEncoder().encode(contentBytes) : contentBytes;
  const body = {
    message,
    content: b64Encode(bytes),
    branch,
    ...(sha ? { sha } : {}),
    ...(author ? { committer: author, author } : {}),
  };
  const res = await gh(
    `/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    { method: "PUT", token, body }
  );
  if (res.status === 409 || res.status === 422) {
    return { ok: false, status: res.status, conflict: true, detail: await res.text() };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, detail: await res.text() };
  }
  const data = await res.json();
  return {
    ok: true,
    status: res.status,
    commit: data.commit?.sha,
    contentSha: data.content?.sha,
  };
}
