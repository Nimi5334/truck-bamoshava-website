/**
 * Truck Site Kit — CMS editor (vanilla JS, NO backend / NO API).
 *
 * Flow for the business owner:
 *   1. Open this page (optionally behind a soft local password).
 *   2. Edit everything — brand, colors, fonts, hero, story, menu, gallery, video,
 *      locations & hours, social, footer. Live preview on the side.
 *   3. Click "פרסום האתר" (Publish): the renderer runs in THIS browser and a
 *      finished, fully self-contained index.html downloads. Images and video are
 *      baked in as data-URIs; the content model is embedded so the editor can
 *      re-open the site later (Import).
 *
 * No content ever leaves the browser on its own. Drafts persist in localStorage.
 * The published index.html is the deliverable the seller hosts on any static host.
 */
import {
  SITE_ID, STORAGE_KEY, starterContentUrl, templateUrl, EDIT_PASSWORD,
  GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, GITHUB_FILE,
} from "./config.js";
import {
  FONT_CHOICES, COLOR_LABELS, TAG_OPTIONS, SOCIAL_OPTIONS,
  SECTION_LABELS, ADDABLE_SECTIONS, DAY_NAMES, LABELS as L,
} from "./schema.js";

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
const rid = (p) => p + "-" + Math.random().toString(36).slice(2, 7);

/* ---------------- state ---------------- */
const state = {
  site: null,
  dirty: false,
  busy: false,
  unlocked: !EDIT_PASSWORD,
  mode: "fixed",       // "fixed" (7-type schema, render.mjs) | "dynamic" (universal.js, per-site fields)
  universal: null,     // { docs, sections, registry, mutatedDocs, fileMap } — only set in "dynamic" mode
};

/* ---------------- persistence (browser only) ---------------- */
function loadDraft() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s) {
    try {
      const parsed = JSON.parse(s);
      // A "dynamic" draft only has meaning alongside its live universal.js
      // session (Documents, registry) — that's never in localStorage, so a
      // stub loaded after a reload can't actually be edited. Ignore it.
      if ((parsed.sections || []).some((sec) => sec.type === "dynamic")) return null;
      return parsed;
    } catch {}
  }
  return null;
}
function saveDraft(site) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(site));
}
async function loadStarter() {
  const res = await fetch(starterContentUrl() + "?bust=" + Date.now());
  if (!res.ok) throw new Error("starter " + res.status);
  return res.json();
}

/* ---------------- status line ---------------- */
let $status;
function setStatus(msg, kind = "") {
  if ($status) {
    $status.textContent = msg || "";
    $status.className = "status-msg " + kind;
  }
}

/* ---------------- optional soft lock ---------------- */
function renderLogin(errMsg) {
  const pw = el("input", { type: "password", id: "pw", autofocus: true });
  const btn = el("button", { class: "btn btn-primary", style: "width:100%" }, L.signin);
  const msg = el("p", { class: "status-msg err" }, errMsg || "");
  const form = el("form", {
    onsubmit: (e) => {
      e.preventDefault();
      if (pw.value === EDIT_PASSWORD) { state.unlocked = true; boot(); }
      else { msg.textContent = "סיסמה שגויה."; }
    },
  },
    el("label", { class: "muted", style: "font-size:.85rem" }, `${L.password} · ${SITE_ID}`),
    pw, btn, msg
  );
  $app.replaceChildren(
    el("div", { class: "login-wrap" },
      el("div", { class: "card login-card" },
        el("h1", {}, L.open_title),
        el("p", {}, L.open_sub),
        form
      )
    )
  );
  pw.focus();
}

/* ---------------- boot / load ---------------- */
async function boot() {
  if (!state.unlocked) { renderLogin(); return; }
  try {
    state.site = loadDraft() || await loadStarter();
    state.dirty = false;
    renderEditor();
  } catch (err) {
    $app.replaceChildren(el("div", { class: "login-wrap" },
      el("div", { class: "card", style: "padding:24px" },
        el("p", {}, "שגיאה בטעינת התוכן ההתחלתי: " + err.message),
        el("p", { class: "muted", style: "font-size:.85rem" }, "ודאו שהקובץ starter/site.json קיים ושהעורך מוגש משרת (לא file://)."))));
  }
}

/* ---------------- editor shell ---------------- */
let $previewFrame = null;
function renderEditor() {
  const site = state.site;
  const isDynamic = state.mode === "dynamic";
  $status = el("div", { class: "status-msg" });

  const topbar = el("div", { class: "topbar" },
    el("span", { class: "title" }, L.app_title),
    el("span", { class: "site-id" }, site.brand?.name || SITE_ID),
    el("span", { class: "spacer" }),
    $status,
    el("button", { class: "btn btn-sm", onclick: openImportModal }, L.import),
    el("button", { class: "btn btn-sm", onclick: togglePreview }, L.preview),
    EDIT_PASSWORD ? el("button", { class: "btn btn-sm", onclick: () => { state.unlocked = false; renderLogin(); } }, L.logout) : null
  );

  const editor = el("div", { class: "editor" },
    isDynamic ? null : panelGeneral(site),
    isDynamic ? null : panelTheme(site),
    isDynamic ? null : panelNav(site),
    panelSections(site),
    isDynamic ? null : panelFooter(site)
  );

  const note = el("span", { class: "muted", style: "font-size:.82rem" },
    isDynamic
      ? "עריכה זו אינה נשמרת בין רענונים — הורידו ZIP כדי לשמור."
      : (GITHUB_TOKEN
        ? "פרסם לאינטרנט ← Vercel מעדכן את האתר תוך שניות."
        : "הורדת קובץ ← שלחו למוכר האתר לפרסום."));
  const savebar = isDynamic
    ? el("div", { class: "savebar" }, el("button", { class: "btn btn-primary", onclick: downloadZip }, "הורדת אתר (ZIP)"), note)
    : el("div", { class: "savebar" },
        el("button", { class: "btn btn-primary", onclick: publishToGitHub }, "פרסם לאינטרנט"),
        el("button", { class: "btn", onclick: downloadFile }, L.publish),
        el("button", { class: "btn", onclick: save }, L.save),
        note);

  const left = el("div", {}, editor, savebar);
  const preview = el("div", { class: "preview-pane hide" }, el("iframe", { title: "preview" }));
  $previewFrame = preview.querySelector("iframe");

  $app.replaceChildren(topbar, el("div", { class: "shell", id: "shell" }, left, preview));
}

let previewDebounce;
function markDirty() {
  state.dirty = true;
  setStatus("יש שינויים שלא נשמרו", "warn");
  if (previewOn) { clearTimeout(previewDebounce); previewDebounce = setTimeout(refreshPreview, 400); }
}

/* ---------------- field builders ---------------- */
function textField(obj, key, label, opts = {}) {
  const id = "f_" + Math.random().toString(36).slice(2);
  const input = opts.area ? el("textarea", { id, rows: opts.rows || 3 }) : el("input", { type: "text", id });
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

function colorField(obj, key, label) {
  const input = el("input", { type: "color", value: toHex6(obj[key] || "#ffffff") });
  input.style.cssText = "width:46px;height:34px;border:none;background:none;padding:0;border-radius:8px;cursor:pointer";
  input.addEventListener("input", () => { obj[key] = input.value; markDirty(); });
  return el("div", { class: "field" }, el("label", {}, label), input);
}

function numField(obj, key, label) {
  const input = el("input", { type: "number", step: "any", value: obj[key] ?? "" });
  input.style.cssText = "width:100%;background:var(--surface-2);border:1.5px solid var(--border);color:var(--ink);border-radius:8px;padding:9px 11px";
  input.addEventListener("input", () => { obj[key] = input.value === "" ? null : parseFloat(input.value); markDirty(); });
  return el("div", { class: "field" }, el("label", {}, label), input);
}

function checkbox(obj, key, defaultTrue = false) {
  const cb = el("input", { type: "checkbox" });
  cb.checked = obj[key] == null ? defaultTrue : !!obj[key];
  cb.addEventListener("change", () => { obj[key] = cb.checked; markDirty(); });
  return cb;
}

function imageField(obj, key, label, hint) {
  const thumb = el("img", { class: "thumb", alt: "" });
  const setThumb = () => { thumb.src = obj[key] ? resolveAssetForPreview(obj[key], obj.__docPath) : ""; };
  setThumb();
  const file = el("input", { type: "file", accept: "image/*", style: "display:none" });
  const upBtn = el("button", { class: "btn btn-sm", type: "button", onclick: () => file.click() }, "העלאת תמונה");
  const pathInput = el("input", { type: "text", value: obj[key] && !isInline(obj[key]) ? obj[key] : (obj[key] ? "(תמונה הוטמעה)" : "") });
  pathInput.style.cssText = "flex:1";
  pathInput.addEventListener("input", () => { obj[key] = pathInput.value; markDirty(); setThumb(); });
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    upBtn.disabled = true; upBtn.textContent = "מעלה…";
    try {
      const rel = await uploadImage(file.files[0]);
      obj[key] = rel; pathInput.value = "(תמונה הוטמעה)"; setThumb(); markDirty();
      setStatus("התמונה נטענה ✓", "ok");
    } catch (err) {
      setStatus("העלאת תמונה נכשלה: " + err.message, "err");
    } finally { upBtn.disabled = false; upBtn.textContent = "העלאת תמונה"; }
  });
  return el("div", { class: "field" },
    el("label", {}, label),
    el("div", { class: "row", style: "align-items:center" }, thumb, pathInput, upBtn, file),
    hint ? el("div", { class: "hint" }, hint) : null
  );
}

function videoField(obj, key, label) {
  const file = el("input", { type: "file", accept: "video/*", style: "display:none" });
  const upBtn = el("button", { class: "btn btn-sm", type: "button", onclick: () => file.click() }, "העלאת וידאו");
  const pathInput = el("input", { type: "text", value: obj[key] && !isInline(obj[key]) ? obj[key] : (obj[key] ? "(וידאו הוטמע)" : "") });
  pathInput.style.cssText = "flex:1";
  pathInput.addEventListener("input", () => { obj[key] = pathInput.value; markDirty(); });
  const note = el("div", { class: "hint" }, "");
  file.addEventListener("change", async () => {
    if (!file.files[0]) return;
    const f = file.files[0];
    upBtn.disabled = true; upBtn.textContent = "טוען…";
    try {
      if (f.size > 8 * 1024 * 1024)
        note.textContent = "שימו לב: וידאו של " + Math.round(f.size / 1048576) + "MB יגדיל מאוד את קובץ האתר. מומלץ עד ~8MB.";
      obj[key] = await fileToDataURL(f);
      pathInput.value = "(וידאו הוטמע)"; markDirty();
      setStatus("הוידאו נטען ✓", "ok");
    } catch (err) {
      setStatus("טעינת וידאו נכשלה: " + err.message, "err");
    } finally { upBtn.disabled = false; upBtn.textContent = "העלאת וידאו"; }
  });
  return el("div", { class: "field" },
    el("label", {}, label),
    el("div", { class: "row", style: "align-items:center" }, pathInput, upBtn, file),
    note
  );
}

/* ---------------- repeater ---------------- */
function repeater(arr, { title, make, render, addLabel, locked }) {
  const wrap = el("div", {});
  function draw() {
    wrap.replaceChildren();
    arr.forEach((item, i) => {
      const head = el("div", { class: "item-head" },
        el("span", { class: "grip" }, title ? title(item, i) : `#${i + 1}`),
        locked ? null : el("div", { class: "icon-btns" },
          el("button", { class: "btn btn-sm", type: "button", disabled: i === 0, onclick: () => { move(arr, i, -1); draw(); markDirty(); } }, L.up),
          el("button", { class: "btn btn-sm", type: "button", disabled: i === arr.length - 1, onclick: () => { move(arr, i, 1); draw(); markDirty(); } }, L.down),
          el("button", { class: "btn btn-sm btn-danger", type: "button", onclick: () => { arr.splice(i, 1); draw(); markDirty(); } }, "✕")
        )
      );
      wrap.append(el("div", { class: "repeater-item" }, head, render(item, i)));
    });
    if (!locked) wrap.append(el("button", { class: "btn btn-add", type: "button", onclick: () => { arr.push(make()); draw(); markDirty(); } }, "+ " + (addLabel || L.add)));
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
    textField(site.meta, "description", L.site_desc, { area: true, rows: 2 }),
    el("div", { class: "row" },
      imageField(site.meta, "favicon", L.favicon, "קובץ קטן, רצוי SVG או PNG"),
      colorField(site.meta, "themeColor", L.theme_color))
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
  const fontOpts = FONT_CHOICES.map((f) => ({ value: f.family, label: f.label }));
  site.theme.fonts = site.theme.fonts || {};
  const headSel = selectField(site.theme.fonts, "head", "גופן כותרות", fontOpts);
  const bodySel = selectField(site.theme.fonts, "body", "גופן טקסט", fontOpts);
  const syncFonts = () => { site.meta.fontsHref = buildFontsHref(site.theme.fonts); markDirty(); };
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
    el("p", { class: "muted", style: "margin-top:14px;font-size:.85rem" }, "כפתור בולט (לא חובה):"),
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
// How many "items" a zone holds, for the count badge. null = not applicable.
function zoneCount(s) {
  const d = s.data || {};
  switch (s.type) {
    case "hero": return (d.ctas || []).length;
    case "richtext": return (d.paragraphs || []).filter((p) => p && p.trim()).length;
    case "menu": return (d.categories || []).reduce((n, c) => n + (c.groups || []).reduce((m, g) => m + (g.items || []).length, 0), 0);
    case "gallery": return (d.images || []).length;
    case "locations": return (d.branches || []).length;
    case "social": return (d.links || []).length;
    case "dynamic": return (d.fieldIds || []).length;
    default: return null; // e.g. "media"
  }
}
// Whether a zone has enough content to be considered ready.
function zoneComplete(s) {
  const d = s.data || {};
  switch (s.type) {
    case "hero": return !!(d.headline && d.headline.trim());
    case "richtext": return (d.paragraphs || []).some((p) => p && p.trim());
    case "media": return !!(d.poster || d.video);
    default: {
      const n = zoneCount(s);
      return n == null ? true : n > 0;
    }
  }
}
function countSiteImages(site) {
  const has = (v) => typeof v === "string" && v.trim();
  let n = 0;
  if (has(site.brand?.logo)) n++;
  if (has(site.footer?.logo)) n++;
  if (has(site.meta?.favicon)) n++;
  for (const s of site.sections || []) {
    const d = s.data || {};
    if (s.type === "hero") { if (has(d.logo)) n++; if (has(d.background)) n++; }
    if (s.type === "gallery") n += (d.images || []).filter((im) => has(im.src)).length;
    if (s.type === "media" && has(d.poster)) n++;
    if (s.type === "dynamic" && state.universal) {
      const countMeta = (id) => {
        const meta = state.universal.registry.getFieldMeta(id);
        if (!meta) return;
        if (meta.kind === "image") n++;
        else if (meta.kind === "group") for (const item of meta.items) item.fieldIds.forEach(countMeta);
      };
      (d.fieldIds || []).forEach(countMeta);
    }
  }
  return n;
}

function panelSections(site) {
  site.sections = site.sections || [];
  let openZone = null; // the section object currently expanded
  let menuZone = null;  // the section object whose "..." menu is open
  const container = el("div", {});
  function draw() {
    container.replaceChildren();

    const total = site.sections.length;
    const incomplete = site.sections.filter((s) => !zoneComplete(s)).length;
    container.append(el("div", { class: "zones-stats" },
      el("div", { class: "zone-stat stat-warn" }, el("span", { class: "num" }, String(incomplete)), el("span", { class: "lbl" }, "דורש השלמה")),
      el("div", { class: "zone-stat" }, el("span", { class: "num" }, String(countSiteImages(site))), el("span", { class: "lbl" }, "תמונות")),
      el("div", { class: "zone-stat stat-clay" }, el("span", { class: "num" }, String(total)), el("span", { class: "lbl" }, "אזורי תוכן"))));

    const list = el("div", { class: "zone-list" });
    site.sections.forEach((s, i) => {
      const count = zoneCount(s);
      const complete = zoneComplete(s);
      const isOpen = openZone === s;
      const row = el("div", { class: "zone-row " + (complete ? "status-ok" : "status-warn") + (isOpen ? " open" : "") });

      const menuBtn = el("button", { class: "btn btn-sm", type: "button", title: "פעולות" }, "⋯");
      menuBtn.addEventListener("click", (e) => { e.stopPropagation(); menuZone = menuZone === s ? null : s; draw(); });
      const menuWrap = el("div", { class: "zone-menu-wrap" }, menuBtn);
      if (menuZone === s) {
        menuWrap.append(el("div", { class: "zone-menu" },
          el("button", { type: "button", disabled: i === 0, onclick: (e) => { e.stopPropagation(); move(site.sections, i, -1); menuZone = null; draw(); markDirty(); } }, "↑ " + "הזזה למעלה"),
          el("button", { type: "button", disabled: i === site.sections.length - 1, onclick: (e) => { e.stopPropagation(); move(site.sections, i, 1); menuZone = null; draw(); markDirty(); } }, "↓ " + "הזזה למטה"),
          el("hr"),
          el("button", { type: "button", class: "danger", onclick: (e) => {
            e.stopPropagation();
            if (confirm("למחוק את האזור הזה?")) { if (openZone === s) openZone = null; site.sections.splice(i, 1); menuZone = null; draw(); markDirty(); }
          } }, "✕ מחיקה")));
      }

      const head = el("div", { class: "zone-row-head", onclick: () => { openZone = isOpen ? null : s; menuZone = null; draw(); } },
        el("span", { class: "zone-count" }, count ? String(count) : "–"),
        el("span", { class: "zone-label" }, SECTION_LABELS[s.type] || s.type),
        el("span", { class: "zone-spacer" }),
        el("label", { class: "toggle", onclick: (e) => e.stopPropagation() }, checkbox(s, "visible", true), L.visible),
        menuWrap,
        el("span", { class: "zone-caret" }));

      row.append(head);
      if (isOpen) row.append(el("div", { class: "zone-row-body" }, sectionEditor(s)));
      list.append(row);
    });
    container.append(list);

    // add-section control — only meaningful for the fixed 7-type schema;
    // a "dynamic" (universal-ingestion) site's zones come only from import.
    if (state.mode === "dynamic") return;
    const sel = el("select", {});
    ADDABLE_SECTIONS.forEach((t) => sel.append(el("option", { value: t }, SECTION_LABELS[t] || t)));
    const addBtn = el("button", { class: "btn btn-add", type: "button", onclick: () => {
      const s = defaultSection(sel.value);
      site.sections.push(s); openZone = s; draw(); markDirty();
    } }, "+ " + L.add_section);
    container.append(el("div", { class: "row", style: "margin-top:14px;align-items:center" }, sel, addBtn));
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
        imageField(d, "background", "תמונת רקע", "מופיעה מאחורי הכותרת. ריק = רקע נקי בצבע."),
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
          render: (_p, i) => {
            const ta = el("textarea", { rows: 3 });
            ta.value = d.paragraphs[i];
            ta.addEventListener("input", () => { d.paragraphs[i] = ta.value; markDirty(); });
            return el("div", { class: "field" }, ta);
          },
        }));
    case "menu":
      return menuEditor(d);
    case "gallery":
      d.images = d.images || [];
      return el("div", {},
        textField(d, "heading", "כותרת"),
        textField(d, "intro", "טקסט פתיחה", { area: true, rows: 2 }),
        el("p", { class: "muted", style: "font-size:.85rem" }, "תמונות הגלריה:"),
        repeater(d.images, {
          title: (im, i) => im.alt || `תמונה ${i + 1}`,
          make: () => ({ src: "", alt: "" }),
          addLabel: "הוספת תמונה",
          render: (im) => el("div", {},
            imageField(im, "src", "תמונה"),
            textField(im, "alt", "תיאור (נגישות)")),
        }));
    case "media":
      return el("div", {},
        imageField(d, "poster", "תמונת פתיחה / נפילה"),
        videoField(d, "video", "וידאו (לא חובה)"),
        textField(d, "sectionLabel", "תיאור האזור (נגישות)"),
        textField(d, "videoLabel", "תיאור הוידאו (נגישות)"));
    case "locations":
      return locationsEditor(d);
    case "dynamic":
      return dynamicSectionEditor(s);
    case "social":
      d.links = d.links || [];
      return el("div", {},
        textField(d, "heading", "כותרת"),
        textField(d, "intro", "טקסט", { area: true, rows: 2 }),
        repeater(d.links, {
          title: (l) => l.label || l.network,
          make: () => ({ network: "instagram", label: "", url: "https://" }),
          render: (l) => el("div", {},
            selectField(l, "network", "רשת", SOCIAL_OPTIONS),
            el("div", { class: "row" }, textField(l, "label", "טקסט"), textField(l, "url", "קישור"))),
        }));
    default:
      return el("div", { class: "muted" }, "אזור מסוג זה אינו נתמך לעריכה.");
  }
}

/* ---------------- dynamic (universal-ingestion) fields ---------------- */
// Adapts a universal.js field id to the {obj,key} shape textField/imageField
// expect, so those existing builders work unmodified against a live DOM node.
function bindField(id) {
  const o = {};
  Object.defineProperty(o, "value", {
    get: () => state.universal.registry.getFieldValue(id),
    set: (v) => { state.universal.registry.setFieldValue(id, v); markDirty(); },
  });
  return o;
}

function dynamicSectionEditor(s) {
  return el("div", {}, ...(s.data.fieldIds || []).map(dynamicFieldRow));
}

function dynamicFieldRow(id) {
  const meta = state.universal.registry.getFieldMeta(id);
  if (!meta) return el("div", {});
  if (meta.kind === "image") {
    const adapter = bindField(id);
    adapter.__docPath = meta.docPath;
    return imageField(adapter, "value", meta.label);
  }
  if (meta.kind === "group") {
    return el("div", {},
      el("p", { class: "muted", style: "font-size:.85rem" }, meta.label + ":"),
      repeater(meta.items, {
        locked: true,
        title: (_item, i) => `#${i + 1}`,
        render: (item) => el("div", {}, ...item.fieldIds.map(dynamicFieldRow)),
      }));
  }
  return textField(bindField(id), "value", meta.label, meta.label.length > 30 ? { area: true, rows: 2 } : {});
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
      make: () => ({ id: rid("cat"), title: "קטגוריה חדשה", groups: [{ items: [] }] }),
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
      make: () => ({ id: rid("branch"), name: "סניף חדש", desc: "", waze: { lat: 0, lng: 0 }, hours: defaultHours() }),
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

/* ---------------- default sections for "add" ---------------- */
function defaultSection(type) {
  const base = { id: rid(type), type, visible: true };
  switch (type) {
    case "hero":
      return { ...base, data: { logo: "", background: "", headline: "כותרת ראשית", lead: "תת-כותרת קצרה על העסק.", ctas: [{ label: "לתפריט", href: "#menu", style: "primary" }, { label: "איך מגיעים", href: "#locations", style: "ghost" }] } };
    case "richtext":
      return { ...base, data: { heading: "הסיפור שלנו", paragraphs: ["כתבו כאן את הסיפור של העסק."] } };
    case "menu":
      return { ...base, data: { heading: "התפריט", intro: "", currency: "₪", categories: [{ id: rid("cat"), title: "קטגוריה", groups: [{ items: [{ name: "מנה", price: "0", desc: "", tags: [] }] }] }] } };
    case "gallery":
      return { ...base, data: { heading: "גלריה", intro: "", images: [] } };
    case "media":
      return { ...base, data: { poster: "", video: "", sectionLabel: "", videoLabel: "" } };
    case "locations":
      return { ...base, data: { heading: "איפה אנחנו", intro: "", footnote: "", branches: [{ id: rid("branch"), name: "סניף", desc: "", waze: { lat: 32.0853, lng: 34.7818 }, hours: defaultHours() }] } };
    case "social":
      return { ...base, data: { heading: "עקבו אחרינו", intro: "", links: [{ network: "instagram", label: "@username", url: "https://instagram.com/" }] } };
    default:
      return { ...base, data: {} };
  }
}

/* ---------------- save / publish / import ---------------- */
function save() {
  if (state.busy) return;
  if (state.mode === "dynamic") {
    setStatus("עריכה זו אינה נשמרת בין רענונים — הורידו ZIP כדי לשמור.", "warn");
    return;
  }
  try {
    saveDraft(state.site);
    state.dirty = false;
    setStatus(L.saved, "ok");
  } catch (err) {
    setStatus("שמירה נכשלה: " + err.message, "err");
  }
}

async function buildHtml() {
  const [{ render }, tplRes] = await Promise.all([
    import("../render.mjs"),
    fetch(templateUrl()),
  ]);
  if (!tplRes.ok) throw new Error("template " + tplRes.status);
  const template = await tplRes.text();
  let html = render(state.site, template);
  // Embed the content model so the editor can re-open the published site later.
  // Escape "<" so the JSON can never close the script tag early.
  const json = JSON.stringify(state.site).replace(/</g, "\\u003c");
  const dataTag = `<script type="application/json" id="cms-data">${json}</script>`;
  return html.replace("</body>", dataTag + "\n</body>");
}

async function downloadFile() {
  if (state.busy) return;
  state.busy = true;
  setStatus(L.publishing, "");
  try {
    saveDraft(state.site);
    const html = await buildHtml();
    download((SITE_ID || "site") + "-index.html", html, "text/html");
    setStatus(L.published, "ok");
  } catch (err) {
    setStatus("הפרסום נכשל: " + err.message, "err");
  } finally { state.busy = false; }
}

async function publishToGitHub() {
  if (state.busy) return;
  if (!GITHUB_TOKEN) {
    setStatus("GitHub Token לא מוגדר — השתמשו ב\"הורדת קובץ\" במקום.", "warn");
    return;
  }
  state.busy = true;
  setStatus("מפרסם לגיטהאב…", "");
  try {
    saveDraft(state.site);
    const html = await buildHtml();

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
    const headers = {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };

    // Fetch current file SHA — required when updating an existing file.
    let sha;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) sha = (await getRes.json()).sha;

    // GitHub API requires base64-encoded content (UTF-8 safe approach).
    const arr = new TextEncoder().encode(html);
    const content = btoa(Array.from(arr, (b) => String.fromCharCode(b)).join(""));

    const body = { message: "עדכון תוכן האתר", content, branch: GITHUB_BRANCH };
    if (sha) body.sha = sha;

    const putRes = await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!putRes.ok) {
      const errBody = await putRes.json().catch(() => ({}));
      throw new Error(errBody.message || "HTTP " + putRes.status);
    }

    setStatus("האתר פורסם ✓ — Vercel מעדכן תוך שניות", "ok");
  } catch (err) {
    setStatus("פרסום נכשל: " + err.message, "err");
  } finally { state.busy = false; }
}

/* ---------------- import: folder upload, classification, routing ---------------- */
function extractEmbedded(html) {
  const m = html.match(/<script[^>]*id=["']cms-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  return JSON.parse(m[1].replace(/\\u003c/g, "<"));
}

function openImportModal() {
  const backdrop = el("div", { class: "modal-backdrop" });
  const close = () => backdrop.remove();

  const folderInput = el("input", { type: "file", webkitdirectory: true, directory: true, multiple: true, style: "display:none" });
  const fileInput = el("input", { type: "file", accept: ".html,.json,text/html,application/json", style: "display:none" });

  const dropzone = el("div", { class: "dropzone" },
    el("p", {}, "גררו לכאן תיקיית אתר"),
    el("p", { class: "muted", style: "font-size:.8rem;margin:2px 0 0" }, "או"));

  const modal = el("div", { class: "import-modal card" },
    el("h2", {}, "טעינת אתר"),
    el("p", { class: "muted" }, "בחרו תיקייה עם קבצי האתר (HTML, CSS, תמונות...), או גררו אותה לכאן. לא צריך לדעת איזה קובץ בדיוק — המערכת תזהה את זה לבד."),
    dropzone,
    el("div", { class: "row", style: "margin-top:14px" },
      el("button", { class: "btn btn-primary", type: "button", onclick: () => folderInput.click() }, "בחירת תיקייה"),
      el("button", { class: "btn btn-sm", type: "button", onclick: () => fileInput.click() }, "בחירת קובץ בודד")),
    folderInput, fileInput,
    el("button", { class: "btn btn-sm", type: "button", style: "margin-top:18px", onclick: close }, "ביטול"));

  backdrop.append(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

  const go = async (files) => { close(); await handleIncomingFiles(files); };
  folderInput.addEventListener("change", () => folderInput.files.length && go([...folderInput.files]));
  fileInput.addEventListener("change", () => fileInput.files.length && go([...fileInput.files]));

  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    const files = await filesFromDataTransfer(e.dataTransfer);
    await go(files);
  });

  document.body.append(backdrop);
}

function openPagePicker(candidates, onChoose) {
  const backdrop = el("div", { class: "modal-backdrop" });
  const close = () => backdrop.remove();
  const modal = el("div", { class: "import-modal card" },
    el("h2", {}, "כמה עמודים נמצאו"),
    el("p", { class: "muted" }, "בחרו את עמוד הבית של האתר:"),
    el("div", { class: "picker-list" },
      ...candidates.map((c) =>
        el("button", { class: "btn", type: "button", style: "display:flex;justify-content:space-between;width:100%;margin:4px 0", onclick: () => { close(); onChoose(c.path); } },
          el("span", {}, c.title || c.path), el("span", { class: "muted" }, c.path)))),
    el("button", { class: "btn btn-sm", type: "button", style: "margin-top:14px", onclick: close }, "ביטול"));
  backdrop.append(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.body.append(backdrop);
}

// Recursively reads a dropped folder via the (Chromium-family) FileSystem
// Entry API; falls back to a flat file list (no nested folders) elsewhere.
async function filesFromDataTransfer(dt) {
  const items = dt.items ? [...dt.items] : [];
  if (items.length && items[0].webkitGetAsEntry) {
    const entries = items.map((it) => it.webkitGetAsEntry()).filter(Boolean);
    if (entries.length) {
      const files = [];
      await Promise.all(entries.map((entry) => walkEntry(entry, "", files)));
      if (files.length) return files;
    }
  }
  return dt.files ? [...dt.files] : [];
}
function walkEntry(entry, prefix, out) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        try { Object.defineProperty(file, "relativePath", { value: prefix + entry.name, configurable: true }); } catch {}
        out.push(file);
        resolve();
      }, () => resolve());
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readBatch = () => {
        reader.readEntries(async (batch) => {
          if (!batch.length) { resolve(); return; }
          await Promise.all(batch.map((e) => walkEntry(e, prefix + entry.name + "/", out)));
          readBatch(); // one call can return a partial batch — keep reading until empty
        }, () => resolve());
      };
      readBatch();
    } else resolve();
  });
}

const TEXT_FILE_RE = /\.(html?|css|m?js|json|svg|txt|xml|map)$/i;
function filePath(file) { return file.webkitRelativePath || file.relativePath || file.name; }

async function buildFileMap(rawFiles) {
  const paths = rawFiles.map(filePath);
  // Strip a single shared leading folder segment (e.g. "my-site/") if every
  // path has one, so map keys are root-relative regardless of how the
  // folder was picked.
  const firstSegs = paths.map((p) => p.split("/")[0]);
  const stripPrefix = paths.every((p) => p.includes("/")) && firstSegs.every((s) => s === firstSegs[0])
    ? firstSegs[0] + "/" : "";

  const map = new Map();
  for (let i = 0; i < rawFiles.length; i++) {
    const file = rawFiles[i];
    let path = paths[i];
    if (stripPrefix && path.startsWith(stripPrefix)) path = path.slice(stripPrefix.length);
    if (!path) continue;
    const kind = TEXT_FILE_RE.test(path) ? "text" : "binary";
    const entry = { path, kind, file };
    if (kind === "text") { try { entry.text = await file.text(); } catch { entry.text = ""; } }
    map.set(path, entry);
  }
  return map;
}

function pageTitle(html) {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].trim() : "";
}

// Never rejects with a hard error — only routes to one of: an existing
// round-trip/leverage-cms site (fixed schema), a generic site (universal.js),
// an ambiguous multi-page picker, or the one friendly "no HTML found" note.
function classifySite(fileMap) {
  const entries = [...fileMap.values()];
  const htmlEntries = entries.filter((e) => e.kind === "text" && /\.html?$/i.test(e.path));

  if (htmlEntries.length === 0) {
    for (const e of entries.filter((x) => x.kind === "text" && /\.json$/i.test(x.path))) {
      try {
        const parsed = JSON.parse(e.text);
        if (parsed && Array.isArray(parsed.sections)) return { kind: "fixed", site: parsed };
      } catch {}
    }
    return { kind: "none" };
  }

  for (const e of htmlEntries) {
    const embedded = extractEmbedded(e.text);
    if (embedded && embedded.sections) return { kind: "fixed", site: embedded };
  }

  const siteJson = fileMap.get("content/site.json") || fileMap.get("site.json");
  if (siteJson) {
    try {
      const parsed = JSON.parse(siteJson.text);
      if (parsed && Array.isArray(parsed.sections)) return { kind: "fixed", site: parsed };
    } catch {}
  }

  const depth = (p) => (p.match(/\//g) || []).length;
  const shallowest = Math.min(...htmlEntries.map((e) => depth(e.path)));
  let candidates = htmlEntries.filter((e) => depth(e.path) === shallowest);
  const indexCandidate = candidates.find((e) => /(^|\/)index\.html?$/i.test(e.path));
  if (indexCandidate) candidates = [indexCandidate];

  if (candidates.length === 1) {
    const rootPath = candidates[0].path;
    return { kind: "generic", rootPath, otherHtmlPaths: htmlEntries.map((e) => e.path).filter((p) => p !== rootPath) };
  }
  return { kind: "ambiguous", candidates: candidates.map((e) => ({ path: e.path, title: pageTitle(e.text) })) };
}

async function handleIncomingFiles(rawFiles) {
  if (!rawFiles || !rawFiles.length) return;
  setStatus("קורא קבצים…", "");
  try {
    const fileMap = await buildFileMap(rawFiles);
    await routeFileMap(fileMap);
  } catch (err) {
    setStatus("טעינה נכשלה: " + err.message, "err");
  }
}

async function routeFileMap(fileMap, chosenRootPath) {
  const result = chosenRootPath
    ? { kind: "generic", rootPath: chosenRootPath, otherHtmlPaths: [...fileMap.values()]
        .filter((e) => e.kind === "text" && /\.html?$/i.test(e.path) && e.path !== chosenRootPath)
        .map((e) => e.path) }
    : classifySite(fileMap);

  if (result.kind === "none") {
    setStatus("לא נמצא קובץ HTML בתיקייה שנבחרה. ודאו שהתיקייה מכילה את קבצי האתר.", "err");
    return;
  }
  if (result.kind === "ambiguous") {
    openPagePicker(result.candidates, (chosen) => routeFileMap(fileMap, chosen));
    return;
  }
  if (result.kind === "fixed") {
    state.mode = "fixed";
    state.universal = null;
    state.site = result.site;
    saveDraft(state.site);
    state.dirty = false;
    renderEditor();
    setStatus("האתר נטען לעריכה ✓", "ok");
    return;
  }

  setStatus("מנתח את מבנה האתר…", "");
  const { analyzeSite } = await import("./universal.js");
  const analysis = analyzeSite(fileMap, { rootPath: result.rootPath, otherHtmlPaths: result.otherHtmlPaths });
  state.mode = "dynamic";
  state.universal = analysis;
  state.site = { meta: {}, sections: analysis.sections };
  state.dirty = false;
  renderEditor();
  setStatus(`האתר נטען לעריכה ✓ (${analysis.sections.length} אזורי תוכן זוהו)`, analysis.sections.length ? "ok" : "warn");
}

function download(name, text, type) {
  downloadBlob(name, new Blob([text], { type: type + ";charset=utf-8" }));
}
function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function downloadZip() {
  if (state.busy || !state.universal) return;
  state.busy = true;
  setStatus("מכין קובץ ZIP…", "");
  try {
    const [{ serializeForZip }, { zipFiles }] = await Promise.all([import("./universal.js"), import("./zip.js")]);
    const entries = await serializeForZip(state.universal);
    const blob = await zipFiles(entries);
    downloadBlob((SITE_ID || "site") + ".zip", blob);
    setStatus("האתר הורד! מוכן להעלאה ✓", "ok");
  } catch (err) {
    setStatus("ההורדה נכשלה: " + err.message, "err");
  } finally { state.busy = false; }
}

/* ---------------- image / video to data-URI ---------------- */
const isInline = (s) => typeof s === "string" && /^(data:|blob:)/.test(s);

function fileToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    r.readAsDataURL(blob);
  });
}

async function uploadImage(file) {
  let blob = file, type = file.type;
  if (type !== "image/svg+xml" && type !== "image/gif") {
    const r = await downscale(file, 1600);
    blob = r.blob; type = r.type;
  }
  return fileToDataURL(blob); // inline data-URI — travels with the export, no hosting
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
  if (state.mode === "dynamic") {
    $previewFrame.srcdoc = `<!doctype html><meta charset=utf-8><body style="font-family:sans-serif;padding:24px;color:#444">תצוגה מקדימה אינה זמינה לאתרים כלליים שהועלו. השתמשו ב"הורדת אתר (ZIP)" ופתחו את index.html שבפנים.</body>`;
    return;
  }
  try {
    const [{ render }, tplRes] = await Promise.all([
      import("../render.mjs"),
      fetch(templateUrl()),
    ]);
    if (!tplRes.ok) throw new Error("template " + tplRes.status);
    const template = await tplRes.text();
    const html = render(state.site, template);
    // Rebase any relative asset URLs to the kit root so they still resolve in the
    // iframe (uploads are data-URIs and need no rebasing).
    const base = new URL(templateUrl());
    $previewFrame.srcdoc = html.replace("<head>", `<head><base href="${base.origin}${base.pathname.replace(/[^/]+$/, "")}">`);
  } catch (err) {
    $previewFrame.srcdoc = `<!doctype html><meta charset=utf-8><body style="font-family:sans-serif;padding:24px;color:#444">טעינת תצוגה מקדימה נכשלה: ${err.message}</body>`;
  }
}

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
  // Always keep Amatic SC (the chalkboard "open/closed" signs use it).
  fams.add("Amatic+SC:wght@700");
  return "https://fonts.googleapis.com/css2?" + [...fams].filter(Boolean).map((f) => "family=" + f).join("&") + "&display=swap";
}
function resolveAssetForPreview(p, docPath) {
  if (/^https?:|^data:|^blob:/.test(p)) return p;
  if (state.mode === "dynamic") return docPath ? resolveDynamicAsset(p, docPath) : p;
  const base = new URL(templateUrl());
  return base.origin + base.pathname.replace(/[^/]+$/, "") + p;
}

// Resolves a generic uploaded site's own relative asset path (e.g.
// "assets/photo.jpg") against its own file map for thumbnail previews —
// the kit's own resolveAssetForPreview base is wrong for these, since the
// image lives in the uploaded folder, not next to this CMS.
const dynamicAssetUrlCache = new Map();
function normalizeAssetPath(p) {
  const parts = [];
  for (const seg of p.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop(); else parts.push(seg);
  }
  return parts.join("/");
}
function resolveDynamicAsset(rawPath, docPath) {
  const fileMap = state.universal && state.universal.fileMap;
  if (!fileMap) return rawPath;
  const dir = docPath.includes("/") ? docPath.slice(0, docPath.lastIndexOf("/") + 1) : "";
  for (const candidate of [rawPath, normalizeAssetPath(dir + rawPath)]) {
    const entry = fileMap.get(candidate);
    if (entry) {
      if (!dynamicAssetUrlCache.has(candidate)) dynamicAssetUrlCache.set(candidate, URL.createObjectURL(entry.file));
      return dynamicAssetUrlCache.get(candidate);
    }
  }
  return rawPath;
}
function defaultHours() { const h = {}; for (let i = 0; i < 7; i++) h[String(i)] = [9, 17]; return h; }

/* ---------------- start ---------------- */
boot();
