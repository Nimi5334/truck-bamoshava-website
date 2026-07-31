/**
 * Leverage CMS — admin editor (vanilla JS).
 *
 * Architecture (all GitHub access is behind the Worker — no token in the browser):
 *   Login:   POST /auth/login {siteId, password} → short-lived session JWT.
 *   Read:    GET  /content                       → {content, sha}.
 *   Save:    PUT  /content {content, sha}         → commit (409 if stale).
 *   Upload:  POST /upload {filename, contentType, dataBase64} → {relPath}.
 *   Preview: runs render() in the browser against the live template.html.
 *
 * The JWT lives only in memory — closing the tab logs out. The Worker resolves
 * the repo from the JWT's siteId (KV registry), so the browser never sees a
 * GitHub token and one client can never reach another's repo.
 */
import { resolveWorkerUrl, resolveTemplateUrl, DEMO, DEMO_PASSWORD, demoContentUrl } from "./config.js";
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
  token: null,       // session JWT from the Worker (in memory only)
  sha: null,         // blob sha of the loaded site.json (optimistic concurrency)
  site: null,
  dirty: false,
  busy: false,
};

/* ---------------- Worker API client ---------------- */
// One Worker serves every site. Base URL from ?worker= (dev) or config.js.
const API = (resolveWorkerUrl(state.siteId) || "").replace(/\/$/, "");

async function api(path, { method = "GET", body, auth = true } = {}) {
  const h = {};
  if (auth && state.token) h.Authorization = `Bearer ${state.token}`;
  if (body !== undefined) h["Content-Type"] = "application/json";
  const res = await fetch(API + path, {
    method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `API ${res.status}`);
    err.status = res.status; err.data = data; throw err;
  }
  return data;
}

const DEMO_KEY = `leverage-cms:demo:${new URLSearchParams(location.search).get("site") || "site"}`;

async function login(siteId, password) {
  if (DEMO) { // no backend — check the demo password locally
    if (password !== DEMO_PASSWORD) throw Object.assign(new Error("invalid"), { status: 401 });
    state.token = "demo";
    return;
  }
  const r = await api("/auth/login", { method: "POST", auth: false, body: { siteId, password } });
  state.token = r.token;
}

async function loadContent() {
  if (DEMO) {
    // Prefer a draft the visitor saved in this browser; else the live content.
    const saved = localStorage.getItem(DEMO_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    const res = await fetch(demoContentUrl() + "?bust=" + Date.now());
    if (!res.ok) throw new Error("could not load demo content: " + res.status);
    return res.json();
  }
  const r = await api("/content");
  state.sha = r.sha;
  return r.content;
}

async function saveContent(content) {
  if (DEMO) { // persist in the browser only — never touches the live site
    localStorage.setItem(DEMO_KEY, JSON.stringify(content));
    return { ok: true, demo: true };
  }
  const r = await api("/content", { method: "PUT", body: { content, sha: state.sha } });
  state.sha = r.sha; // advance to the new sha so the next save isn't a false conflict
  return r;
}

const bytesToB64 = (bytes) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };

async function uploadImageToWorker(filename, contentType, bytes) {
  const r = await api("/upload", {
    method: "POST",
    body: { filename, contentType, dataBase64: bytesToB64(bytes) },
  });
  return r.relPath; // path as referenced inside site.json (e.g. "assets/logo.webp")
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
        await login(state.siteId, pw.value); // 401 if the site/password is wrong
        await boot();
      } catch (err) {
        msg.textContent = err.status === 401 ? "סיסמה שגויה." : "שגיאת התחברות: " + err.message;
        btn.disabled = false; btn.textContent = L.signin;
      }
    } },
    el("label", { class: "muted", style: "font-size:.85rem" }, `${L.password} · ${state.siteId || "—"}`),
    pw, btn, msg
  );
  const demoHint = DEMO
    ? el("p", { class: "muted", style: "font-size:.82rem;margin-top:14px;text-align:center" },
        `מצב הדגמה · סיסמה: ${DEMO_PASSWORD}`)
    : null;
  $app.replaceChildren(
    el("div", { class: "login-wrap" },
      el("div", { class: "card login-card" },
        el("h1", {}, L.login_title),
        el("p", {}, L.login_sub),
        form,
        demoHint
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
    el("span", { class: "title" }, "Nimrod CMS"),
    el("span", { class: "site-id" }, site.brand?.name || state.siteId),
    el("span", { class: "spacer" }),
    $status,
    el("button", { class: "btn btn-sm", onclick: togglePreview }, L.preview),
    el("button", { class: "btn btn-sm", onclick: openTemplateGuide }, "תבניות לאתר"),
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
  const savebarNote = DEMO
    ? "מצב הדגמה — השינויים נשמרים בדפדפן בלבד ולא מתפרסמים."
    : "שינויים נשמרים ל-GitHub ומתפרסמים תוך כדקה.";
  const savebar = el("div", { class: "savebar" }, saveBtn, el("span", { class: "muted", style: "font-size:.85rem" }, savebarNote));

  const demoBanner = DEMO
    ? el("div", { style: "background:var(--warn);color:#1b1206;padding:8px 20px;font-size:.85rem;font-weight:600;text-align:center" },
        "מצב הדגמה: אפשר לערוך ולראות תצוגה מקדימה. השינויים נשמרים בדפדפן שלך בלבד — האתר עצמו לא משתנה.")
    : null;

  const left = el("div", {}, demoBanner, editor, savebar);
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
    const r = await saveContent(state.site);
    state.dirty = false;
    setStatus(r?.demo ? "נשמר בדפדפן (מצב הדגמה) ✓" : L.saved, "ok");
  } catch (err) {
    if (err.status === 401) { state.token = null; renderLogin("התחברו מחדש."); }
    else if (err.status === 409) setStatus("התוכן השתנה מאז שטענת. רעננו את הדף ונסו שוב.", "err");
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
  if (DEMO) return URL.createObjectURL(blob); // browser-only preview; not persisted
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return uploadImageToWorker(name, type, bytes);
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
  if (/^https?:|^data:|^blob:/.test(p)) return p;
  const tplUrl = resolveTemplateUrl(state.siteId);
  if (!tplUrl) return p;
  const base = new URL(tplUrl);
  return base.origin + base.pathname.replace(/[^/]+$/, "") + p;
}
function defaultHours() { const h = {}; for (let i = 0; i < 7; i++) h[String(i)] = [9, 17]; return h; }

/* ────────────── template guide modal ─────────────── */
function openTemplateGuide() {
  const overlay = el("div", { class: "modal-overlay", onclick: (e) => {
    if (e.target === overlay) overlay.remove();
  }});

  const closeBtn = el("button", { class: "modal-close", onclick: () => overlay.remove() }, "✕");

  const header = el("div", { class: "modal-header" },
    el("h2", {}, "תבנית עיצוב — Prompt לעזר AI"),
    closeBtn
  );

  const body = el("div", { class: "modal-body" },
    el("p", {}, "אתה עומד ליצור תבנית אתר חדשה — עיצוב עתידני ומונע-אנימציה, ייחודי ולא גנרי."),
    el("p", {}, "הלחצן להלן מעתיק prompt מלא לעזר AI (Claude, ChatGPT, וכו') שיכול ליצור תבנית HTML בעלת:"),
    el("ul", {},
      el("li", {}, "כיוון עתידני עם קו עיצובי ספציפי (לא קלישאות גלקסי/גרדיאנט)"),
      el("li", {}, "אנימציית חתימה אחת מוקפדת — לא עומס אפקטים"),
      el("li", {}, "ביצועים מעולים גם עם אנימציה כבדה (LCP < 2s, CLS < 0.1)"),
      el("li", {}, "תמיכה RTL/Hebrew ראשונית — כולל כיווני אנימציה"),
      el("li", {}, "חוזק מול שימוש לא תקני של לקוחות")
    ),
    el("p", { class: "muted", style: "font-size:.85rem;margin-top:16px" },
      "הפרומפט מכיל את כל הגבולות העיצובים, תקציב האנימציה, דרישות RTL, והוראות לפורמט HTML עבור ה-CMS שלנו.")
  );

  const copyBtn = el("button", { class: "copy-btn", onclick: () => copyGuidePrompt() },
    "📋 העתק Prompt");

  body.appendChild(copyBtn);

  const content = el("div", { class: "modal-content template-guide" }, header, body);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

function copyGuidePrompt() {
  const prompt = `You are a design lead at a studio known for futuristic, motion-driven websites that win awards AND rank in search. You are paid for a specific point of view, not for taste in general.

═══════════════════════════════════════════════════════════════════════════════
TASK: Generate a FUTURISTIC, ANIMATED HTML template for a Hebrew-first,
      self-edit CMS (Nimrod CMS)
═══════════════════════════════════════════════════════════════════════════════

Direction: futuristic, high-motion, digital-native. Think interfaces, not
brochures — HUD-like precision, kinetic type, depth via layering and motion
rather than skeuomorphic shadow. Animation is not a garnish here, it is the
product. But "futuristic" is not one look — see Gate 1.

The CMS uses a JSON data structure (site.json) with:
- site.brand: { name, logo }
- site.meta: { title, description, fontsHref }
- site.theme: { colors: {}, fonts: { head, body }, radius }
- site.nav: { links: [], cta: { label, href } }
- site.sections: [] (reorderable content blocks)
- site.footer: { logo, copyright, regions, links: [] }

SECTION TYPES available:
- hero: { logo, background, headline, lead, ctas: [] }
- richtext: { heading, paragraphs: [] }
- menu: { heading, intro, currency, categories: [] }
- media: { poster, video, sectionLabel, videoLabel }
- locations: { heading, intro, footnote, branches: [] }
- social: { heading, intro, links: [] }

═══════════════════════════════════════════════════════════════════════════════
GATE 1 — UNIQUENESS (not templated)
═══════════════════════════════════════════════════════════════════════════════

BANNED patterns — the "futuristic" clichés everyone reaches for first
(restart if tempted, do not repair):
❌ Purple-to-blue or pink-to-cyan gradient mesh as the whole background
❌ Glassmorphism / frosted panels over a blurred gradient blob
❌ Generic "particle network" or floating dots-and-lines canvas
❌ Neon outline text, chromatic-aberration glitch text as decoration only
❌ Centered hero: eyebrow pill + huge headline + two buttons + screenshot
❌ Three-column feature grid with icon in rounded square above
❌ Bento grid used as a substitute for having a layout idea
❌ Generic dark-mode-only palette with a single neon accent and nothing else
❌ Stock 3D globe / abstract blob mesh (Spline-default look)
❌ Scroll-jacked full-page slides that trap the wheel

BANNED type:
❌ Inter, Poppins, Montserrat, Roboto, Open Sans, Lato as the display face
❌ One font family doing every job at three weights
❌ Generic monospace-as-signifier-of-tech with no other typographic idea

BANNED copy:
❌ "Elevate", "Transform", "Unlock", "Seamlessly", "Empower"
❌ "The future of X", "Take your X to the next level", "Where X meets Y"
❌ "Your journey starts here", "Built different", "Powered by AI"

✅ REQUIRED — LINEAGE: "Futuristic" must be built from a SPECIFIC, named
system, not a mood board. Before designing, pick ONE concrete lineage and
state it in one line:
  • an instrument panel / HUD from a real discipline (avionics, motorsport
    telemetry, lab equipment, broadcast control room)
  • a data-visualization tradition (radar, oscilloscope, seismograph, sonar)
  • a signage/way-finding system built for speed-of-read (transit, airport,
    mission control)
  • a material or physical process (circuit trace, holography, fiber optics,
    machined metal, anodized panel)
Every colour, type choice, spacing rule, and — critically — every ANIMATION
must trace back to that one lineage. A pinned counter that spins because
"HUD numbers do that" is earned; a random parallax layer bolted on for
flair is not. If the animation could be swapped onto an unrelated brief
with zero changes, it is decoration, not the system. Restart.

═══════════════════════════════════════════════════════════════════════════════
GATE 2 — ADMISSION (template must survive real client misuse)
═══════════════════════════════════════════════════════════════════════════════

PERFORMANCE targets (non-negotiable — motion is the product, so it must
be fast motion, not heavy motion):
• LCP < 2.0s on throttled 4G, mid-tier Android. Hero media never blocker; poster first, media after.
• Total animation JS < 80KB gzipped (raised from a static-site budget because motion is the signature here) — but every KB must earn its place; prefer CSS animation/@property/scroll-timeline over JS where the effect allows it.
• GPU-cheap properties only: transform + opacity (+ filter/clip-path sparingly). No animating width, height, top/left, or box-shadow spread on every frame.
• IntersectionObserver over scroll listeners; rAF-throttle pointer-driven and canvas-driven effects.
• If using <canvas>/WebGL for a hero effect (radar sweep, particle field tied to the lineage, etc.), cap it: pause when off-screen, pause on tab blur, degrade resolution on low-end/mobile, hard frame budget.
• Images: explicit width/height, modern format (WebP), responsive srcset, lazy below fold, eager + fetchpriority="high" on LCP.
• Fonts: subset (Latin + Hebrew), preloaded, font-display: swap, max two families.
• CLS < 0.1. Every media slot has reserved aspect-ratio box.
• Primary copy exists in DOM at load. Never render headline or body text in JS only.

RESILIENCE — render three times:
a) Every text field at 3x expected length, in Hebrew.
b) Every text field at one word. Optional sections empty.
c) Wrong aspect ratios; portrait image where landscape expected; one missing image.
If any breaks layout, overflows, clips text, or leaves orphaned empty section → fix DESIGN, not content.

Requirements:
• No fixed heights on text containers. No text baked into images.
• Every repeater works with 1 item and with 12.
• Every optional section collapses cleanly to nothing.
• prefers-reduced-motion: motion degrades to opacity or nothing. The page must be fully legible and navigable with zero animation.
• Pinned/scrubbed scroll sections are allowed as the signature device, but must release predictably, never trap touch scrolling, and never require more than one pinned section per page — restraint applies to motion too.

ACCESS & CRAWL:
• Semantic landmarks, one h1, logical heading order, visible keyboard focus
• 4.5:1 contrast on body text, real focus order on interactive components
• Schema.org JSON-LD per vertical. Per-page title/meta, canonical, Open Graph
• Descriptive alt text describing content, not decoration

═══════════════════════════════════════════════════════════════════════════════
GATE 3 — RTL-NATIVE (the competitive moat)
═══════════════════════════════════════════════════════════════════════════════

This template sells into Hebrew-speaking market. RTL is the default, not a patch.

CSS rules:
• Logical properties ONLY: margin-inline-start, padding-inline, inset-inline-end, text-align: start, border-inline
• Zero left/right in authored CSS
• Grid and flex follow logical flow. No hardcoded column order.
• Mirror motion vectors with dir="rtl": entrance direction, parallax drift, wipe, sweep, underline origin, carousel, pin/release edges, cursor-follow offset
• Directional glyphs flip (arrows, chevrons, quotes, progress, breadcrumb). NO flip: logos, clocks, photographs, tool pictograms
• Numbers, prices, phone, dates, codes, units, Latin brand names stay LTR inside Hebrew. Use bidi isolation, never manual spacing
• Hebrew typeface is first-class, not fallback. Real character, retune leading up, remove positive tracking at display sizes
• Hebrew has no uppercase or italic. Design equivalents with weight/width/size/color, never faux-caps or oblique
• Render LTR and RTL side-by-side before shipping. RTL build must be visually equal quality.

═══════════════════════════════════════════════════════════════════════════════
TEMPLATE STRUCTURE (Liquid / template.html format)
═══════════════════════════════════════════════════════════════════════════════

Use \`{{{ data.key }}}\` to render CMS fields (HTML-escaped). Example:
  <h1>{{{ site.brand.name }}}</h1>
  <p>{{{ section.data.headline }}}</p>

For image fields: {{{ data.image }}} outputs the relative path from CMS.
For arrays (sections, nav.links, locations.branches): use <!-- loop --> <!-- /loop -->

Use inline style attribute for theme colors:
  <div style="background: {{{ site.theme.colors.bg }}}; color: {{{ site.theme.colors.ink }}};"></div>

For fonts:
  <link rel="preload" href="{{{ site.meta.fontsHref }}}" as="style">
  <link rel="stylesheet" href="{{{ site.meta.fontsHref }}}">

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Deliver a complete, self-contained HTML file:
- <html lang="he" dir="rtl">
- Full <!DOCTYPE html>, <head>, <meta viewport>, <style>, <body>
- All CSS in <style> tag (no external stylesheets except fonts)
- No JavaScript libraries (vanilla JS only if needed)
- All CMS field bindings with {{{ }}} syntax
- Semantic HTML5 (main, section, header, footer, nav)
- One h1 per page
- Logical property grid/flex for RTL
- Prefers-reduced-motion support

═══════════════════════════════════════════════════════════════════════════════
SIGNATURE MOTION — pick ONE, make it earn its place
═══════════════════════════════════════════════════════════════════════════════

Choose exactly one scroll/interaction device as the memorable thing, tied
directly to the lineage you named in Gate 1. Everything else on the page
stays quiet and disciplined — restraint is what separates "futuristic" from
"busy." Examples of the category (adapt to your lineage, don't copy literally):
  • pinned rail that scrubs like a scan-line or radar sweep on scroll progress
  • counters/readouts that tick like telemetry when a section enters view
  • a thin trace/circuit line that draws itself along the scroll path
  • cursor-reactive HUD reticle or targeting bracket on interactive elements
  • a status-board flicker/refresh transition between states
Ten effects on one page reads as cheap and fails Gate 2 on performance and
Gate 1 on restraint.

═══════════════════════════════════════════════════════════════════════════════
DESIGN DIRECTION
═══════════════════════════════════════════════════════════════════════════════

Create a template that:
1. Has a SPECIFIC futuristic lineage (instrument panel, data-viz tradition, way-finding system, or material/process) — state it first
2. Passes all three Gates without compromise — fast, resilient, RTL-equal
3. Uses ONE signature motion device tied to that lineage; everything else quiet
4. Reflects the CMS's flexibility (any industry, any brand)
5. Prioritizes Hebrew readability and RTL elegance — motion included
6. Requires ZERO client tweaks for content misuse to not break layout

Design for food/restaurant/truck businesses primarily, but must work for any single-location service business (salon, gym, studio, etc.) without looking generic in either direction.

Begin.`;

  navigator.clipboard.writeText(prompt).then(() => {
    setStatus("Prompt copied to clipboard ✓", "ok");
  }).catch(() => {
    setStatus("Copy failed", "err");
  });
}

/* ---------------- start ---------------- */
if (!state.siteId) {
  $app.replaceChildren(el("div", { class: "login-wrap" },
    el("div", { class: "card" }, el("p", {}, "חסר מזהה אתר. פתחו את הקישור עם ?site=<id>."))));
} else {
  renderLogin();
}
