/**
 * Admin panel configuration.
 *
 * resolveTemplateUrl(siteId, cfg) — returns the URL of the site's template.html
 *   for the live preview iframe. Derived from the repo config (no hardcoding needed).
 *   Returns null to disable preview.
 *
 * For local dev, override with ?tpl=http://localhost:8741/template.html
 */
const params = new URLSearchParams(location.search);

// Map siteId -> live domain (the GitHub Pages custom domain if set, else ghpages URL).
// The admin reads site.json from raw.githubusercontent.com and template.html from here.
const SITE_ORIGINS = {
  "truck-bamoshava": "https://truckbamoshava.co.il",
};

export function resolveTemplateUrl(siteId, cfg) {
  if (params.get("tpl")) return params.get("tpl");
  // Try the registered custom domain first; fall back to GitHub Pages URL.
  const custom = SITE_ORIGINS[siteId];
  if (custom) return `${custom}/template.html`;
  if (cfg?.repo) {
    const [owner, repo] = cfg.repo.split("/");
    return `https://${owner}.github.io/${repo}/template.html`;
  }
  return null;
}
