# Leverage CMS

A reusable, **$0/month** way to let non-technical clients edit their own static
sites. Each site stays a hand-built static site on GitHub Pages; this adds an
editing layer on top. Clients edit text, images, menus/prices, colors, fonts,
and section order/visibility — no GitHub account, no code.

```
client browser ──▶ Admin SPA ──▶ Worker ──▶ GitHub commit ──▶ Action renders ──▶ GitHub Pages
                   (forms)       (auth +       (site.json)      (template +        (live in ~1 min)
                                  validate)                      site.json →
                                                                 index.html)
```

## The three pieces

### 1. Per-site content (`<siteDir>/`)
- `content/site.json` — the editable content model (the single source of truth).
- `template.html` — the static shell (all CSS/JS verbatim) with `{{…}}` holes.
- `index.html` — **generated** by CI from the two above; never edited by hand.

`templates/render.mjs` bakes `site.json` into `index.html` at deploy time
(build-time rendering → real static HTML, good SEO, no flash-of-unstyled-content,
and a JSON error can never blank the live site). It is generic and keyed by
section `type`, so new sites need content, not code. All text is HTML-escaped
and dietary tags map to a fixed icon set — the content model can't inject script.

### 2. Admin SPA (`admin/`)
One static, framework-free editor served once; opened as `/?site=<siteId>`.
Schema-driven forms for every section, an image uploader (client-side
downscale), a theme editor, section show/hide/reorder, and a live preview that
reuses `render()` in the browser. The session JWT lives only in memory.

### 3. Auth + commit Worker (`worker/`)
One Cloudflare Worker for all sites. Authenticates a per-site password → JWT,
then reads/writes that site's `site.json` and image uploads on GitHub via a
short-lived GitHub App token. The repo a request may touch is resolved only
from the `CLIENTS` KV registry keyed by the JWT's `siteId`, so one client can
never reach another's repo. See `worker/README.md` for deploy.

## Security model
- **No token in the browser** — the GitHub App key lives only in the Worker.
- **Server-side validation** (`worker/src/validate.mjs`) rejects bad payloads
  before commit: unknown section types, non-hex colors, disallowed href
  schemes, invalid dietary tags, oversized bodies. Text is stored verbatim and
  escaped at render — no field becomes raw HTML.
- **Cross-tenant isolation** via the KV-resolved siteId + CORS locked to the
  admin origin.
- **Optimistic concurrency** — saves carry the blob sha; a stale save gets 409.
- **Rate limiting** per site+IP.

## Layout
```
leverage-cms/
  templates/render.mjs     shared CI renderer (also powers the live preview)
  admin/                   the editor SPA (index.html, app.js, schema.js, config.js)
  worker/                  the auth+commit Worker (+ unit tests)
  tools/
    extract.mjs            onboarding scaffolder
    hash-password.mjs      generate a client password hash
    dev-mock.mjs           local end-to-end harness (no deploy needed)
  ONBOARDING.md            step-by-step to add a new client site
```

## Quick start (local, no deploy)
```bash
node leverage-cms/tools/dev-mock.mjs    # serves admin + mock API + pilot site
# open the printed URL; log in with password "demo"
node leverage-cms/worker && npm test    # run the Worker security/logic tests
```

Adding a new client: see [ONBOARDING.md](ONBOARDING.md). The pilot site
(`truck-bamoshava/`) is a complete worked example.
