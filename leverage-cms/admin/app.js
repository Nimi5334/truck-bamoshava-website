/**
 * Leverage CMS — admin editor (vanilla JS).
 *
 * Architecture (no backend server required):
 *   Login: PBKDF2(password) → AES-GCM decrypts the site's GitHub token.
 *   Read:  raw.githubusercontent.com (public, no token needed).
 *   Write: GitHub Actions workflow_dispatch (token used only to trigger it).
 *          The Action validates content server-side and commits with GITHUB_TOKEN.
 *   Upload: GitHub Contents API with the decrypted token (images only).
 *   Preview: runs render() in the browser against the live template.html.
 *
 * The decrypted token lives only in memory — closing the tab logs out.
 */
import { resolveTemplateUrl } from "./config.js";
import { FONT_CHOICES, COLOR_LABELS, TAG_OPTIONS, SECTION_LABELS, DAY_NAMES, LABELS as L } from "./schema.js";

/* ---------------- tiny DOM helper ---------------- */
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, "");
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}
const $app = document.getElementById("app");

/* ---------------- state ---------------- */
const state = {
  siteId: new URLSearchParams(location.search).get("site") || "",
  token: null,       // decrypted GitHub token (in memory only)
  siteConfig: null,  // the sites/<siteId>.json config
  site: null,
  dirty: false,
  busy: false,
};

/* ---------------- crypto: decrypt the stored token ---------------- */
const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function decryptToken(encryptedToken, password) {
  const enc = new TextEncoder();
  const salt = b64ToBytes(encryptedToken.salt);
  const iv   = b64ToBytes(encryptedToken.iv);
  const ct   = b64ToBytes(encryptedToken.ct);
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plain);
}

/* ---------------- GitHub API helpers ---------------- */
const GH = "https://api.github.com";

async function ghApi(path, { method = "GET", token, body } = {}) {
  const h = { "User-Agent": "leverage-cms", "X-GitHub-Api-Version": "2022-11-28",
               Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body) h["Content-Type"] = "application/json";
  const res = await fetch(GH + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data?.message) || `GitHub API ${res.status}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

async function loadContent() {
  const cfg = state.siteConfig;
  // Public repo → raw URL works without a token, always fresh.
  const url = `https://raw.githubusercontent.com/${cfg.repo}/main/${cfg.contentPath}`;
  const res = await fetch(url + "?bust=" + Date.now());
  if (!res.ok) throw new Error("Could not load site.json: " + res.status);
  return res.json();
}

async function dispatchWrite(content) {
  const cfg = state.siteConfig;
  const minified = JSON.stringify(content);
  const b64 = btoa(unescape(encodeURIComponent(minified)));
  await ghApi(`/repos/${cfg.repo}/actions/workflows/${cfg.dispatchWorkflow}/dispatches`, {
    method: "POST",
    token: state.token,
    body: { ref: cfg.branch, inputs: { site_id: cfg.siteId, content_b64: b64 } },
  });
}

async function uploadImageViaContents(filename, contentType, bytes) {
  const cfg = state.siteConfig;
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `${cfg.uploadsPath}/${safe}`;
  const b64 = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ""));
  // Try to get existing sha for update (file may not exist yet).
  let sha;
  try {
    const existing = await ghApi(`/repos/${cfg.repo}/contents/${path}`, { token: state.token });
    sha = existing.sha;
  } catch (e) { if (e.status !== 404) throw e; }
  await ghApi(`/repos/${cfg.repo}/contents/${path}`, {
    method: "PUT", token: state.token,
    body: { message: `cms(${cfg.siteId}): upload ${safe}`, content: b64, branch: cfg.branch,
            ...(sha ? { sha } : {}), committer: { name: "Leverage CMS", email: "cms@leverage.local" } },
  });
  // Return the site-relative path (e.g. "assets/logo.png")
  const siteParts = cfg.contentPath.split("/").slice(0, -2); // strip content/site.json
  const fullParts = path.split("/");
  let i = 0; while (i < siteParts.length && siteParts[i] === fullParts[i]) i++;
  return fullParts.slice(i).join("/");
}

/* ---------------- status line ---------------- */
let $status;
function setStatus(msg, kind = "") {
  if ($status) {
    $status.textContent = msg || "";
    $status.className = "status-msg " + kind;
  }
}

/* ---------------- login ---------------- */
function renderLogin(errMsg) {
  const pw = el("input", { type: "password", class: "", id: "pw", autofocus: true });
  pw.style.cssText = "width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:var(--panel-2);color:var(--ink);margin:6px 0 14px";
  const btn = el("button", { class: "btn btn-primary", style: "width:100%" }, L.signin);
  const msg = el("p", { class: "status-msg err" }, errMsg || "");
  const form = el("form", { onsubmit: async (e) => {
      e.preventDefault();
      btn.disabled = true; btn.textContent = "…";
      try {
        // Load the site config (contains the encrypted token).
        const cfgUrl = new URL(`./sites/${state.siteId}.json`, import.meta.url);
        const cfgRes = await fetch(cfgUrl);
        if (!cfgRes.ok) throw Object.assign(new Error("אתר לא ידוע"), { status: 404 });
        const cfg = await cfgRes.json();
        // Decrypt: wrong password causes AES-GCM to throw.
        let token;
        try { token = await decryptToken(cfg.encryptedToken, pw.value); }
        catch { throw Object.assign(new Error("סיסמה שגויה."), { status: 401 }); }
        state.siteConfig = cfg;
        state.token = token;
        await boot();
      } catch (err) {
        msg.textContent = err.status === 401 ? "סיסמה שגויה." : "שגיאת התחברות: " + err.message;
        btn.disabled = false; btn.textContent = L.signin;
      }
    } },
    el("label", { class: "muted", style: "font-size:.85rem" }, `${L.password} · ${state.siteId || "—"}`),
    pw, btn, msg
  );
  $app.replaceChildren(
    el("div", { class: "login-wrap" },
      el("div", { class: "card login-card" },
        el("h1", {}, L.login_title),
        el("p", {}, L.login_sub),
        form
      )
    )
  );
  pw.focus();
}

/* ---------------- boot / load ---------------- */
async function boot() {
  try {
    state.site = await loadContent();
    state.dirty = false;
    renderEditor();
  } catch (err) {
    renderLogin("שגיאה בטעינת התוכן: " + err.message);
  }
}

/* ---------------- editor shell ---------------- */
let $previewFrame = null;
function renderEditor() {
  const site = state.site;
  $status = el("div", { class: "status-msg" });

  const topbar = el("div", { class: "topbar" },
    el("span", { class: "title" }, "Leverage CMS"),
    el("span", { class: "site-id" }, site.brand?.name || state.siteId),
    el("span", { class: "spacer" }),
    $status,
    el("button", { class: "btn btn-sm", onclick: togglePreview }, L.preview),
    el("button", { class: "btn btn-sm", onclick: () => { state.token = null; renderLogin(); } }, L.logout)
  );

  const editor = el("div", { class: "editor" },
    panelGeneral(site),
    panelTheme(site),
    panelNav(site),
    panelSections(site),
    panelFooter(site)
  );

  const saveBtn = el("button", { class: "btn btn-primary", onclick: save }, L.save);
  const savebar = el("div", { class: "savebar" }, saveBtn, el("span", { class: "muted", style: "font-size:.85rem" }, "שינויים נשמרים ל-GitHub ומתפרסמים תוך כדקה."));

  const left = el("div", {}, editor, savebar);
  const preview = el("div", { class: "preview-pane hide" }, el("iframe", { title: "preview" }));
  $previewFrame = preview.querySelector("iframe");

  $app.replaceChildren(topbar, el("div", { class: "shell", id: "shell" }, left, preview));
}

let previewDebounce;
function markDirty() {
  state.dirty = true;
  setStatus("יש שינויים שלא נשמרו", "warn");
  if (previewOn) { clearTimeout(previewDebounce); previewDebounce = setTimeout(refreshPreview, 500); }
}

/* ---------------- field builders ---------------- */
function textField(obj, key, label, opts = {}) {
  const id = "f_" + Math.random().toString(36).slice(2);
  const input = opts.area
    ? el("textarea", { id, rows: opts.rows || 3 })
    : el("input", { type: "text", id });
  input.value = obj[key] ?? "";
  if (opts.placeholder) input.setAttribute("placeholder", opts.placeholder);
  input.addEventListener("input", () => { obj[key] = input.value; markDirty(); if (opts.onInput) opts.onInput(); });
  return el("div", { class: "field" },
    el("label", { for: id }, label),
    input,
    opts.hint ? el("div", { class: "hint" }, opts.hint) : null
  );
}

function selectField(obj, key, label, options) {
  const sel = el("select", {});
  for (const o of options) {
    const opt = el("option", { value: o.value }, o.label);
    if (obj[key] === o.value) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener("change", () => { obj[key] = sel.value; markDirty(); });
  return el("div", { class: "field" }, el("label", {}, label), sel);
}

function imageField(obj, key, label) {
  const thumb = el("img", { class: "thumb", alt: "" });
  const setThumb = () => { thumb.src = obj[key] ? resolveAssetForPreview(obj[key]) : ""; };
  setThumb();
  const file = el("input", { type: "file", accept: "image/*", style: "display:none" });
  const upBtn = el("button", { class: "btn btn-sm", type: "button", onclick: () => file.click() }, "העלאת תמונה");
  const pathInput = el("input", { type: "text", value: obj[key] || "" });
  pathInput.style.cssText = "flex:1";
  pathInput.addEventListener("input", () => { obj[key] = pathInput.value; markDirty(); setThumb(); });
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    upBtn.disabled = true; upBtn.textContent = "מעלה…";
    try {
      const rel = await uploadImage(file.files[0]);
      obj[key] = rel; pathInput.value = rel; setThumb(); markDirty();
      setStatus("התמונה הועלתה", "ok");
    } catch (err) {
      setStatus("העלאת תמונה נכשלה: " + err.message, "err");
    } finally { upBtn.disabled = false; upBtn.textContent = "העלאת תמונה"; }
  });
  return el("div", { class: "field" },
    el("label", {}, label),
    el("div", { class: "row", style: "align-items:center" }, thumb, pathInput, upBtn, file)
  );
}

/* ---------------- repeater ---------------- */
function repeater(arr, { title, make, render, addLabel }) {
  const wrap = el("div", {});
  function draw() {
    wrap.replaceChildren();
    arr.forEach((item, i) => {
      const head = el("div", { class: "item-head" },
        el("span", { class: "grip" }, title ? title(item, i) : `#${i + 1}`),
        el("div", { class: "icon-btns" },
          el("button", { class: "btn btn-sm", type: "button", disabled: i === 0, onclick: () => { move(arr, i, -1); draw(); markDirty(); } }, L.up),
          el("button", { class: "btn btn-sm", type: "button", disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); draw(); markDirty(); } }, L.down),
          el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => { arr.splice(i, 1); draw(); markDirty(); } }, "✕")
        )
      );
      wrap.append(el("div", { class: "repeater-item" }, head, render(item, i)));
    });
    wrap.append(el("button", { class: "btn btn-add", type: "button", onclick: () => { arr.push(make()); draw(); markDirty(); } }, "+ " + (addLabel || L.add)));
  }
  draw();
  return wrap;
}
function move(arr, i, dir) { const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

/* ---------------- panels ---------------- */
function panel(titleText, ...body) {
  return el("details", { class: "panel", open: true },
    el("summary", {}, titleText),
    el("div", { class: "panel-body" }, ...body)
  );
}

function panelGeneral(site) {
  site.brand = site.brand || {};
  site.meta = site.meta || {};
  return panel(L.general,
    textField(site.brand, "name", L.brand_name),
    imageField(site.brand, "logo", L.logo),
    textField(site.meta, "title", L.site_title),
    textField(site.meta, "description", L.site_desc, { area: true, rows: 2 })
  );
}

function panelTheme(site) {
  site.theme = site.theme || { colors: {}, fonts: {} };
  const colors = site.theme.colors || (site.theme.colors = {});
  const swatches = el("div", { class: "swatch-grid" },
    ...Object.keys(COLOR_LABELS).map((key) => {
      const input = el("input", { type: "color", value: toHex6(colors[key] || "#000000") });
      input.addEventListener("input", () => { colors[key] = input.value; markDirty(); });
      return el("div", { class: "swatch" }, input, el("span", { class: "sw-label" }, COLOR_LABELS[key]));
    })
  );
  // fonts
  const fontOpts = FONT_CHOICES.map((f) => ({ value: f.family, label: f.label }));
  site.theme.fonts = site.theme.fonts || {};
  const headSel = selectField(site.theme.fonts, "head", "גופן כותרות", fontOpts);
  const bodySel = selectField(site.theme.fonts, "body", "גופן טקסט", fontOpts);
  // keep meta.fontsHref in sync when fonts change
  const syncFonts = () => { site.meta.fontsHref = buildFontsHref(site.theme.fonts); };
  headSel.querySelector("select").addEventListener("change", syncFonts);
  bodySel.querySelector("select").addEventListener("change", syncFonts);
  return panel(L.theme, swatches, el("div", { class: "row" }, headSel, bodySel),
    textField(site.theme, "radius", L.radius, { hint: "לדוגמה 14px" }));
}

function panelNav(site) {
  site.nav = site.nav || { links: [] };
  site.nav.links = site.nav.links || [];
  const links = repeater(site.nav.links, {
    title: (l) => l.label || "קישור",
    make: () => ({ label: "קישור חדש", href: "#" }),
    render: (l) => el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "href", "קישור")),
  });
  site.nav.cta = site.nav.cta || { label: "", href: "#" };
  return panel(L.navigation, links,
    el("p", { class: "muted", style: "margin-top:14px;font-size:.85rem" }, "כפתור בולט:"),
    el("div", { class: "row" }, textField(site.nav.cta, "label", "טקסט הכפתור"), textField(site.nav.cta, "href", "קישור")));
}

function panelFooter(site) {
  site.footer = site.footer || { links: [] };
  site.footer.links = site.footer.links || [];
  const links = repeater(site.footer.links, {
    title: (l) => l.label || "קישור",
    make: () => ({ label: "קישור", href: "#" }),
    render: (l) => el("div", {},
      el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "href", "קישור")),
      el("label", { class: "toggle" }, checkbox(l, "external"), "נפתח בלשונית חדשה")),
  });
  return panel(L.footer,
    imageField(site.footer, "logo", "לוגו בתחתית"),
    textField(site.footer, "copyright", "זכויות יוצרים"),
    textField(site.footer, "regions", "טקסט נוסף"),
    el("p", { class: "muted", style: "font-size:.85rem" }, "קישורים בתחתית:"), links);
}

/* ---------------- sections ---------------- */
function panelSections(site) {
  site.sections = site.sections || [];
  const container = el("div", {});
  function draw() {
    container.replaceChildren();
    site.sections.forEach((s, i) => {
      const head = el("div", { class: "item-head" },
        el("span", { class: "grip" },
          el("span", { class: "section-type" }, SECTION_LABELS[s.type] || s.type)),
        el("label", { class: "toggle" }, checkbox(s, "visible", true), L.visible),
        el("div", { class: "icon-btns" },
          el("button", { class: "btn btn-sm", type: "button", disabled: i === 0, onclick: () => { move(site.sections, i, -1); draw(); markDirty(); } }, L.up),
          el("button", { class: "btn btn-sm", type: "button", disabled: i === site.sections.length - 1, onclick: () => { move(site.sections, i, 1); draw(); markDirty(); } }, L.down))
      );
      container.append(el("div", { class: "repeater-item" }, head, sectionEditor(s)));
    });
  }
  draw();
  return panel(L.sections, container);
}

function sectionEditor(s) {
  const d = s.data = s.data || {};
  switch (s.type) {
    case "hero":
      d.ctas = d.ctas || [];
      return el("div", {},
        imageField(d, "logo", "לוגו"),
        imageField(d, "background", "תמונת רקע"),
        textField(d, "headline", "כותרת", { area: true, rows: 2, hint: "שורה חדשה = מעבר שורה" }),
        textField(d, "lead", "תת-כותרת", { area: true, rows: 2 }),
        el("p", { class: "muted", style: "font-size:.85rem" }, "כפתורים:"),
        repeater(d.ctas, {
          title: (c) => c.label || "כפתור",
          make: () => ({ label: "כפתור", href: "#", style: "primary" }),
          render: (c) => el("div", {},
            el("div", { class: "row" }, textField(c, "label", "טקסט"), textField(c, "href", "קישור")),
            selectField(c, "style", "סגנון", [{ value: "primary", label: "בולט" }, { value: "ghost", label: "מתאר" }])),
        }));
    case "richtext":
      d.paragraphs = d.paragraphs || [];
      return el("div", {},
        textField(d, "heading", "כותרת"),
        el("p", { class: "muted", style: "font-size:.85rem" }, "פסקאות:"),
        repeater(d.paragraphs, {
          title: (_p, i) => `פסקה ${i + 1}`,
          make: () => "",
          // paragraphs are plain strings -> wrap in an object-like accessor
          render: (_p, i) => {
            const ta = el("textarea", { rows: 3 });
            ta.value = d.paragraphs[i];
            ta.addEventListener("input", () => { d.paragraphs[i] = ta.value; markDirty(); });
            return el("div", { class: "field" }, ta);
          },
        }));
    case "menu":
      return menuEditor(d);
    case "media":
      return el("div", {},
        imageField(d, "poster", "תמונת פתיחה לוידאו"),
        textField(d, "video", "נתיב הוידאו", { hint: "קובץ וידאו מנוהל על ידי הסטודיו" }),
        textField(d, "sectionLabel", "תיאור האזור (נגישות)"),
        textField(d, "videoLabel", "תיאור הוידאו (נגישות)"));
    case "locations":
      return locationsEditor(d);
    case "social":
      d.links = d.links || [];
      return el("div", {},
        textField(d, "heading", "כותרת"),
        textField(d, "intro", "טקסט", { area: true, rows: 2 }),
        repeater(d.links, {
          title: (l) => l.label || l.network,
          make: () => ({ network: "instagram", label: "", url: "https://" }),
          render: (l) => el("div", {},
            selectField(l, "network", "רשת", [{ value: "instagram", label: "אינסטגרם" }, { value: "facebook", label: "פייסבוק" }]),
            el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "url", "קישור"))),
        }));
    default:
      return el("div", { class: "muted" }, "אזור מסוג זה אינו נתמך לעריכה.");
  }
}

function menuEditor(d) {
  d.categories = d.categories || [];
  return el("div", {},
    textField(d, "heading", "כותרת התפריט"),
    textField(d, "intro", "טקסט פתיחה", { area: true, rows: 2 }),
    textField(d, "currency", "מטבע", { hint: "₪" }),
    el("p", { class: "muted", style: "font-size:.85rem;margin-top:12px" }, "קטגוריות:"),
    repeater(d.categories, {
      title: (c) => c.title || "קטגוריה",
      make: () => ({ id: "cat-" + Math.random().toString(36).slice(2, 7), title: "קטגוריה חדשה", groups: [{ items: [] }] }),
      addLabel: "הוספת קטגוריה",
      render: (c) => {
        c.groups = c.groups || [];
        return el("div", {},
          el("div", { class: "row" }, textField(c, "title", "שם הקטגוריה"), textField(c, "navLabel", "שם בתפריט (אופציונלי)")),
          textField(c, "note", "הערה (אופציונלי)"),
          el("p", { class: "muted", style: "font-size:.82rem" }, "קבוצות מנות:"),
          repeater(c.groups, {
            title: (g) => g.subhead || "קבוצה",
            make: () => ({ subhead: "", items: [] }),
            addLabel: "הוספת קבוצה",
            render: (g) => {
              g.items = g.items || [];
              return el("div", {},
                textField(g, "subhead", "כותרת קבוצה (אופציונלי)"),
                repeater(g.items, {
                  title: (it) => it.name || "מנה",
                  make: () => ({ name: "מנה חדשה", price: "", desc: "", tags: [] }),
                  addLabel: "הוספת מנה",
                  render: (it) => el("div", {},
                    el("div", { class: "row" }, textField(it, "name", "שם המנה"), textField(it, "price", "מחיר")),
                    textField(it, "desc", "תיאור", { area: true, rows: 2 }),
                    tagPicker(it)),
                }));
            },
          }));
      },
    }));
}

function locationsEditor(d) {
  d.branches = d.branches || [];
  return el("div", {},
    textField(d, "heading", "כותרת"),
    textField(d, "intro", "טקסט פתיחה", { area: true, rows: 2 }),
    textField(d, "footnote", "הערת שוליים", { area: true, rows: 2 }),
    el("p", { class: "muted", style: "font-size:.85rem" }, "סניפים:"),
    repeater(d.branches, {
      title: (b) => b.name || "סניף",
      make: () => ({ id: "branch-" + Math.random().toString(36).slice(2, 7), name: "סניף חדש", desc: "", waze: { lat: 0, lng: 0 }, hours: defaultHours() }),
      addLabel: "הוספת סניף",
      render: (b) => {
        b.waze = b.waze || { lat: 0, lng: 0 };
        b.hours = b.hours || defaultHours();
        return el("div", {},
          textField(b, "name", "שם הסניף"),
          textField(b, "desc", "תיאור", { area: true, rows: 2 }),
          el("div", { class: "row" }, numField(b.waze, "lat", "Waze קו רוחב"), numField(b.waze, "lng", "Waze קו אורך")),
          el("p", { class: "muted", style: "font-size:.82rem" }, "שעות פתיחה (24 שעות, ריק = סגור):"),
          hoursGrid(b.hours));
      },
    }));
}

function hoursGrid(hours) {
  const grid = el("div", { class: "hours-grid" });
  for (let day = 0; day < 7; day++) {
    const cur = hours[String(day)] ?? hours[day] ?? null;
    const open = el("input", { type: "number", min: 0, max: 24, step: 0.5, value: cur ? cur[0] : "" });
    const close = el("input", { type: "number", min: 0, max: 24, step: 0.5, value: cur ? cur[1] : "" });
    const sync = () => {
      const o = open.value === "" ? null : parseFloat(open.value);
      const c = close.value === "" ? null : parseFloat(close.value);
      hours[String(day)] = o == null || c == null ? null : [o, c];
      markDirty();
    };
    open.addEventListener("input", sync);
    close.addEventListener("input", sync);
    grid.append(el("span", { class: "day" }, DAY_NAMES[day]), open, close,
      el("span", { class: "muted", style: "font-size:.75rem" }, "פתיחה / סגירה"));
  }
  return grid;
}

function tagPicker(item) {
  item.tags = item.tags || [];
  const wrap = el("div", { class: "field" }, el("label", {}, "סימונים"));
  const pick = el("div", { class: "tag-pick" });
  for (const t of TAG_OPTIONS) {
    const cb = el("input", { type: "checkbox" });
    cb.checked = item.tags.includes(t.value);
    cb.addEventListener("change", () => {
      const i = item.tags.indexOf(t.value);
      if (cb.checked && i < 0) item.tags.push(t.value);
      else if (!cb.checked && i >= 0) item.tags.splice(i, 1);
      markDirty();
    });
    pick.append(el("label", { class: "toggle" }, cb, t.label));
  }
  wrap.append(pick);
  return wrap;
}

function numField(obj, key, label) {
  const input = el("input", { type: "number", step: "any", value: obj[key] ?? "" });
  input.style.cssText = "width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--ink);border-radius:8px;padding:9px 11px";
  input.addEventListener("input", () => { obj[key] = input.value === "" ? null : parseFloat(input.value); markDirty(); });
  return el("div", { class: "field" }, el("label", {}, label), input);
}

function checkbox(obj, key, defaultTrue = false) {
  const cb = el("input", { type: "checkbox" });
  cb.checked = obj[key] == null ? defaultTrue : !!obj[key];
  cb.addEventListener("change", () => { obj[key] = cb.checked; markDirty(); });
  return cb;
}

/* ---------------- save ---------------- */
async function save() {
  if (state.busy) return;
  state.busy = true;
  setStatus(L.saving, "");
  try {
    await dispatchWrite(state.site);
    state.dirty = false;
    setStatus(L.saved, "ok");
  } catch (err) {
    if (err.status === 401) { state.token = null; renderLogin("התחברו מחדש."); }
    else setStatus("השמירה נכשלה: " + err.message, "err");
  } finally { state.busy = false; }
}

/* ---------------- image upload (client-side downscale) ---------------- */
async function uploadImage(file) {
  let blob = file, type = file.type, name = file.name;
  if (file.type !== "image/svg+xml" && file.type !== "image/gif") {
    const r = await downscale(file, 1600);
    blob = r.blob; type = r.type; name = name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg");
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return uploadImageViaContents(name, type, bytes);
}

function downscale(file, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = el("canvas"); canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const type = canvas.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
      canvas.toBlob((b) => b ? resolve({ blob: b, type }) : reject(new Error("encode failed")), type, 0.85);
    };
    img.onerror = () => reject(new Error("invalid image"));
    img.src = URL.createObjectURL(file);
  });
}


/* ---------------- preview ---------------- */
let previewOn = false;
async function togglePreview() {
  previewOn = !previewOn;
  const shell = document.getElementById("shell");
  const pane = shell.querySelector(".preview-pane");
  shell.classList.toggle("with-preview", previewOn);
  pane.classList.toggle("hide", !previewOn);
  if (previewOn) await refreshPreview();
}
async function refreshPreview() {
  const tplUrl = resolveTemplateUrl(state.siteId);
  if (!tplUrl) { $previewFrame.srcdoc = previewMsg("תצוגה מקדימה לא הוגדרה לאתר זה."); return; }
  try {
    // render.mjs is served alongside the admin at ./templates/render.mjs
    const [{ render }, tplRes] = await Promise.all([
      import("./templates/render.mjs"),
      fetch(tplUrl),
    ]);
    if (!tplRes.ok) throw new Error("template " + tplRes.status);
    const template = await tplRes.text();
    const html = render(state.site, template);
    // Rebase relative asset URLs to the live origin so images/video load.
    const base = new URL(tplUrl);
    $previewFrame.srcdoc = html.replace("<head>", `<head><base href="${base.origin}${base.pathname.replace(/[^/]+$/, "")}">`);
  } catch (err) {
    $previewFrame.srcdoc = previewMsg("טעינת תצוגה מקדימה נכשלה: " + err.message);
  }
}
function previewMsg(m) { return `<!doctype html><meta charset=utf-8><body style="font-family:sans-serif;padding:24px;color:#444">${m}</body>`; }

/* ---------------- helpers ---------------- */
function toHex6(v) {
  if (typeof v !== "string") return "#000000";
  let s = v.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return "#" + s.slice(1).split("").map((c) => c + c).join("");
  if (/^#[0-9a-fA-F]{8}$/.test(s)) return s.slice(0, 7);
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return "#000000";
}
function buildFontsHref(fonts) {
  const fams = new Set();
  for (const v of Object.values(fonts || {})) {
    const f = FONT_CHOICES.find((c) => c.family === v);
    if (f) fams.add(f.href.match(/family=([^&]+)/)?.[1]);
  }
  // Always keep Amatic SC (used by the chalkboard signs design).
  fams.add("Amatic+SC:wght@700");
  return "https://fonts.googleapis.com/css2?" + [...fams].filter(Boolean).map((f) => "family=" + f).join("&") + "&display=swap";
}
function resolveAssetForPreview(p) {
  if (/^https?:|^data:/.test(p)) return p;
  const tplUrl = resolveTemplateUrl(state.siteId, state.siteConfig);
  if (!tplUrl) return p;
  const base = new URL(tplUrl);
  return base.origin + base.pathname.replace(/[^/]+$/, "") + p;
}
function defaultHours() { const h = {}; for (let i = 0; i < 7; i++) h[String(i)] = [9, 17]; return h; }

/* ---------------- start ---------------- */
if (!state.siteId) {
  $app.replaceChildren(el("div", { class: "login-wrap" },
    el("div", { class: "card" }, el("p", {}, "חסר מזהה אתר. פתחו את הקישור עם ?site=<id>."))));
} else {
  renderLogin();
}
