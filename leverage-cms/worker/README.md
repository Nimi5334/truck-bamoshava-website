# Leverage CMS — Worker (auth + commit)

One Cloudflare Worker serves **every** client site. It authenticates a client
with a per-site password, then reads/writes that site's `content/site.json`
(and image uploads) on GitHub using a short-lived GitHub App token. The GitHub
token never reaches the browser.

## Endpoints
| Method + path     | Auth         | Purpose |
|-------------------|--------------|---------|
| `GET  /health`    | none         | liveness check |
| `POST /auth/login`| password     | `{siteId, password}` → `{token}` (JWT, 12h) |
| `GET  /content`   | Bearer JWT   | current `site.json` + blob `sha` |
| `PUT  /content`   | Bearer JWT   | `{content, sha}` → validate → commit |
| `POST /upload`    | Bearer JWT   | `{filename, contentType, dataBase64}` → commit image |

The repo/path a request can touch is resolved **only** from the `CLIENTS` KV
registry keyed by the JWT's `siteId`. A forged `?site=` or `body.siteId` can
never reach another client's repo.

## One-time setup
```bash
cd leverage-cms/worker
npm install

# KV namespaces
wrangler kv namespace create CLIENTS   # paste id into wrangler.toml
wrangler kv namespace create RATE      # paste id into wrangler.toml

# GitHub App: create one at https://github.com/settings/apps with
#   Repository permission: Contents = Read & write
# Install it on each client repo, note the installation id.

# Secrets
wrangler secret put GH_APP_ID            # the App's numeric id
wrangler secret put GH_APP_PRIVATE_KEY   # paste the App's PEM private key
wrangler secret put JWT_SIGNING_SECRET   # a long random string

# Set ALLOWED_ORIGIN in wrangler.toml to the admin panel's exact origin.
wrangler deploy
```

## Registering a client (KV)
Generate a password hash, then store the registry entry:
```bash
node ../tools/hash-password.mjs "the-client-password"
# -> pbkdf2$210000$...$...

wrangler kv key put --binding CLIENTS "truck-bamoshava" '{
  "repo": "Nimi5334/website",
  "branch": "main",
  "contentPath": "truck-bamoshava/content/site.json",
  "uploadsPath": "truck-bamoshava/assets",
  "installationId": "12345678",
  "login": { "passwordHash": "pbkdf2$210000$...$..." }
}'
```

## Tests
```bash
npm test   # node --test — JWT, password hashing, schema/security validation
```
These run under Node (no deploy needed). For full integration, `wrangler dev`
and exercise the endpoints with a real App installation.
