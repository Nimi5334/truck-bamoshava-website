/**
 * Admin panel configuration.
 *
 * resolveWorkerUrl(siteId) — base URL of the Cloudflare Worker that handles
 *   auth + content + uploads for every site. One Worker serves all clients.
 *   Override locally with ?worker=http://localhost:8799
 *
 * resolveTemplateUrl(siteId) — URL of the site's template.html for the live
 *   preview iframe. Returns null to disable preview.
 *   Override locally with ?tpl=http://localhost:8799/site/template.html
 */
const params = new URLSearchParams(location.search);

// The deployed Worker. After `wrangler deploy`, set this to the printed URL
// (e.g. https://leverage-cms.<your-subdomain>.workers.dev) or a custom route.
const WORKER_URL = "https://leverage-cms.example.workers.dev";

// siteId -> live origin (custom domain if set, else the GitHub Pages URL).
// The preview iframe loads template.html and assets from here. Add a line per
// site you onboard (see leverage-cms/ONBOARDING.md step 7).
const SITE_ORIGINS = {
  "truck-bamoshava": "https://truckbamoshava.co.il",
};

/* ---------------- demo mode ----------------
 * ?demo=1 runs the editor with NO backend: local login, content read from the
 * already-published site, saves kept in the browser only. Lets anyone try the
 * full editing experience from one link — no account, no install, no Worker. */
export const DEMO = params.get("demo") === "1";
export const DEMO_PASSWORD = "demo";

// In a published build the admin lives at <site>/_cms/, so the live content and
// template sit one level up — same origin, public, no auth.
export const demoContentUrl = () => new URL("../content/site.json", location.href).href;

export function resolveWorkerUrl(/* siteId */) {
  return params.get("worker") || WORKER_URL;
}

export function resolveTemplateUrl(siteId) {
  if (params.get("tpl")) return params.get("tpl");
  if (DEMO) return new URL("../template.html", location.href).href; // same origin as /_cms/
  const origin = SITE_ORIGINS[siteId];
  return origin ? `${origin}/template.html` : null;
}
