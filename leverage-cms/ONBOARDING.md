# Onboarding a client site to Leverage CMS

Turn a hand-built static site into one a non-technical client can edit. Do this
once per site. Steps 1–5 are local; 6–8 wire up the live editor.

## 1. Scaffold the content draft
```bash
node leverage-cms/tools/extract.mjs <siteDir>
```
This writes `<siteDir>/content/site.draft.json` with meta, theme tokens, and
brand pre-filled, plus a scaffold of the detected sections.

## 2. Fill in the content model
Edit the draft so each section's `data` matches the real page. Use
`truck-bamoshava/content/site.json` as the reference for every section type
(`hero`, `richtext`, `menu`, `media`, `locations`, `social`). Then rename:
```
<siteDir>/content/site.draft.json  ->  <siteDir>/content/site.json
```

## 3. Make the template
Copy `index.html` to `<siteDir>/template.html` and replace the dynamic regions
with placeholders (see `truck-bamoshava/template.html`):

| Placeholder       | Replaces |
|-------------------|----------|
| `{{LANG}}`, `{{DIR}}` | `<html lang dir>` |
| `{{TITLE}}`, `{{DESCRIPTION}}`, `{{FAVICON}}`, `{{THEME_COLOR}}`, `{{FONTS_HREF}}` | head meta |
| `{{TOKENS}}`      | the contents of `:root { … }` |
| `{{HEADER}}`      | inside `<header>` |
| `{{SECTIONS}}`    | inside `<main>` |
| `{{FOOTER}}`      | inside `<footer>` |
| `{{HOURS_JSON}}`  | the `var HOURS = {…}` object literal |

Keep all CSS and JS verbatim — only the data-bearing parts become placeholders.
If the site has a section type the renderer doesn't support yet, add a
`render<Type>` function in `leverage-cms/templates/render.mjs` and register it
in `RENDERERS`.

## 4. Render and gate
```bash
node leverage-cms/templates/render.mjs <siteDir>
```
Diff the generated `index.html` against the original — there must be **no
semantic difference** (whitespace/comment-only diffs are fine). This proves the
refactor changed nothing the visitor sees.

## 5. Wire the deploy
Add the render step to the site's GitHub Action before the publish step
(see `.github/workflows/deploy.yml`):
```yaml
- uses: actions/setup-node@v4
  with: { node-version: 20 }
- run: node leverage-cms/templates/render.mjs <siteDir>
```

> **First client only — deploy the Worker once.** Steps 6–8 assume the shared
> Worker is already live. If it isn't, follow `leverage-cms/worker/README.md`
> (deploy it, then set `WORKER_URL` in `leverage-cms/admin/config.js` to the
> deployed URL). One Worker serves every client; you only do this once.

## 6. Install the GitHub App
Install the Leverage CMS GitHub App on the client's repo (Contents: read/write)
and note the installation id.

## 7. Register the client
```bash
node leverage-cms/tools/hash-password.mjs "client-password"   # -> hash
wrangler kv key put --binding CLIENTS "<siteId>" '{
  "repo": "<owner>/<repo>",
  "branch": "main",
  "contentPath": "<siteDir>/content/site.json",
  "uploadsPath": "<siteDir>/assets",
  "installationId": "<id>",
  "login": { "passwordHash": "<hash>" }
}'
```
Add the site's live origin to `SITE_ORIGINS` in `leverage-cms/admin/config.js`
so the editor's live preview can load it.

## 8. Hand off
Send the client:
- their editor link: `https://<admin-host>/?site=<siteId>`
- their password
- a one-line note: "edit, press שמירה, the site updates within a minute."

## Try it locally first
No deploy needed to see the whole flow:
```bash
node leverage-cms/tools/dev-mock.mjs
# open the printed URL, log in with password "demo"
```
