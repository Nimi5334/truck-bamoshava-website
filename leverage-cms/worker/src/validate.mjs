/**
 * Schema validation for the editable content model (site.json).
 *
 * This is the server-side security boundary. The Worker rejects any payload
 * that fails validation BEFORE committing it to GitHub. Combined with the
 * fact that render.mjs HTML-escapes every field and never emits client text
 * as raw markup, this blocks stored XSS: there is no field whose value
 * reaches the page as executable HTML.
 *
 * Returns { ok: true, value } or { ok: false, errors: [...] }.
 */

const LIMITS = {
  textShort: 200, // names, labels, headings
  textMedium: 600, // descriptions, intros
  textLong: 4000, // paragraphs
  arrayMax: 400, // items in any array
  jsonBytesMax: 512 * 1024, // total serialized size
};

const DIET_TAGS = new Set(["vegan", "vegan-option", "gf"]);
const SECTION_TYPES = new Set(["hero", "richtext", "menu", "media", "locations", "social"]);
const CTA_STYLES = new Set(["primary", "ghost"]);
const SOCIAL_NETWORKS = new Set(["instagram", "facebook"]);

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_LEN = /^[0-9]{1,4}(px|rem|em|%)$/;
// font-family value: quoted names + generic families, commas/spaces. No braces/semicolons/parens.
const FONT_STACK = /^[\w\s",-]+$/;
const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:)/i;

export function validateSite(input) {
  const errors = [];
  const E = (msg) => errors.push(msg);

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["root must be an object"] };
  }

  // Size guard first (cheap DoS protection).
  let serialized;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return { ok: false, errors: ["payload is not serializable"] };
  }
  if (serialized.length > LIMITS.jsonBytesMax) {
    return { ok: false, errors: [`payload too large (> ${LIMITS.jsonBytesMax} bytes)`] };
  }

  const str = (v, max, label) => {
    if (typeof v !== "string") {
      E(`${label} must be a string`);
      return false;
    }
    if (v.length > max) {
      E(`${label} exceeds ${max} chars`);
      return false;
    }
    return true;
  };

  const optStr = (v, max, label) => v == null || str(v, max, label);

  const href = (v, label) => {
    if (!str(v, LIMITS.textMedium, label)) return;
    if (!SAFE_HREF.test(v)) E(`${label} is not an allowed URL/href`);
  };

  // ---- meta ----
  if (typeof input.meta !== "object" || !input.meta) E("meta is required");
  else {
    str(input.meta.title, LIMITS.textMedium, "meta.title");
    optStr(input.meta.description, LIMITS.textMedium, "meta.description");
    optStr(input.meta.favicon, LIMITS.textMedium, "meta.favicon");
    optStr(input.meta.lang, 16, "meta.lang");
    optStr(input.meta.dir, 8, "meta.dir");
    optStr(input.meta.fontsHref, LIMITS.textLong, "meta.fontsHref");
    if (input.meta.themeColor && !HEX.test(input.meta.themeColor))
      E("meta.themeColor must be a hex color");
  }

  // ---- theme ----
  if (typeof input.theme !== "object" || !input.theme) E("theme is required");
  else {
    const c = input.theme.colors || {};
    for (const [k, v] of Object.entries(c)) {
      if (!HEX.test(v)) E(`theme.colors.${k} must be a hex color`);
    }
    if (input.theme.radius && !CSS_LEN.test(input.theme.radius))
      E("theme.radius must be a CSS length (e.g. 14px)");
    const fonts = input.theme.fonts || {};
    for (const [k, v] of Object.entries(fonts)) {
      if (typeof v !== "string" || !FONT_STACK.test(v))
        E(`theme.fonts.${k} contains disallowed characters`);
    }
  }

  // ---- brand ----
  if (typeof input.brand !== "object" || !input.brand) E("brand is required");
  else {
    str(input.brand.name, LIMITS.textShort, "brand.name");
    optStr(input.brand.logo, LIMITS.textMedium, "brand.logo");
  }

  // ---- nav ----
  if (input.nav) {
    arr(input.nav.links, "nav.links", (l, i) => {
      str(l.label, LIMITS.textShort, `nav.links[${i}].label`);
      href(l.href, `nav.links[${i}].href`);
    });
    if (input.nav.cta) {
      str(input.nav.cta.label, LIMITS.textShort, "nav.cta.label");
      href(input.nav.cta.href, "nav.cta.href");
    }
  }

  // ---- sections ----
  if (!Array.isArray(input.sections)) E("sections must be an array");
  else if (input.sections.length > LIMITS.arrayMax) E("too many sections");
  else input.sections.forEach((s, i) => validateSection(s, i, { E, str, optStr, href, arr }));

  // ---- footer ----
  if (input.footer) {
    optStr(input.footer.logo, LIMITS.textMedium, "footer.logo");
    optStr(input.footer.copyright, LIMITS.textMedium, "footer.copyright");
    optStr(input.footer.regions, LIMITS.textMedium, "footer.regions");
    arr(input.footer.links, "footer.links", (l, i) => {
      str(l.label, LIMITS.textShort, `footer.links[${i}].label`);
      href(l.href, `footer.links[${i}].href`);
    });
  }

  function arr(value, label, each) {
    if (value == null) return;
    if (!Array.isArray(value)) {
      E(`${label} must be an array`);
      return;
    }
    if (value.length > LIMITS.arrayMax) {
      E(`${label} has too many entries`);
      return;
    }
    value.forEach((v, i) => each(v, i));
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: input };
}

function validateSection(s, i, ctx) {
  const { E, str, optStr, href, arr } = ctx;
  const p = `sections[${i}]`;
  if (typeof s !== "object" || !s) {
    E(`${p} must be an object`);
    return;
  }
  str(s.id, LIMITS.textShort, `${p}.id`);
  if (!SECTION_TYPES.has(s.type)) {
    E(`${p}.type "${s.type}" is not allowed`);
    return;
  }
  if (s.visible != null && typeof s.visible !== "boolean") E(`${p}.visible must be boolean`);
  const d = s.data || {};

  switch (s.type) {
    case "hero":
      optStr(d.logo, LIMITS.textMedium, `${p}.data.logo`);
      optStr(d.logoAlt, LIMITS.textMedium, `${p}.data.logoAlt`);
      optStr(d.background, LIMITS.textMedium, `${p}.data.background`);
      str(d.headline, LIMITS.textMedium, `${p}.data.headline`);
      optStr(d.lead, LIMITS.textMedium, `${p}.data.lead`);
      arr(d.ctas, `${p}.data.ctas`, (c, j) => {
        str(c.label, LIMITS.textShort, `${p}.data.ctas[${j}].label`);
        href(c.href, `${p}.data.ctas[${j}].href`);
        if (c.style && !CTA_STYLES.has(c.style)) E(`${p}.data.ctas[${j}].style invalid`);
      });
      break;
    case "richtext":
      optStr(d.heading, LIMITS.textShort, `${p}.data.heading`);
      arr(d.paragraphs, `${p}.data.paragraphs`, (para, j) =>
        str(para, LIMITS.textLong, `${p}.data.paragraphs[${j}]`)
      );
      break;
    case "menu":
      optStr(d.heading, LIMITS.textShort, `${p}.data.heading`);
      optStr(d.intro, LIMITS.textMedium, `${p}.data.intro`);
      optStr(d.currency, 8, `${p}.data.currency`);
      arr(d.categories, `${p}.data.categories`, (cat, j) => {
        const cp = `${p}.data.categories[${j}]`;
        str(cat.id, LIMITS.textShort, `${cp}.id`);
        str(cat.title, LIMITS.textShort, `${cp}.title`);
        optStr(cat.navLabel, LIMITS.textShort, `${cp}.navLabel`);
        optStr(cat.note, LIMITS.textMedium, `${cp}.note`);
        arr(cat.groups, `${cp}.groups`, (g, k) => {
          const gp = `${cp}.groups[${k}]`;
          optStr(g.subhead, LIMITS.textShort, `${gp}.subhead`);
          arr(g.items, `${gp}.items`, (it, m) => {
            const ip = `${gp}.items[${m}]`;
            str(it.name, LIMITS.textShort, `${ip}.name`);
            str(it.price, 32, `${ip}.price`);
            optStr(it.desc, LIMITS.textMedium, `${ip}.desc`);
            if (it.tags != null) {
              if (!Array.isArray(it.tags)) E(`${ip}.tags must be an array`);
              else it.tags.forEach((t) => {
                if (!DIET_TAGS.has(t)) E(`${ip}.tags contains invalid tag "${t}"`);
              });
            }
          });
        });
      });
      break;
    case "media":
      optStr(d.video, LIMITS.textMedium, `${p}.data.video`);
      optStr(d.poster, LIMITS.textMedium, `${p}.data.poster`);
      optStr(d.sectionLabel, LIMITS.textMedium, `${p}.data.sectionLabel`);
      optStr(d.videoLabel, LIMITS.textMedium, `${p}.data.videoLabel`);
      break;
    case "locations":
      optStr(d.heading, LIMITS.textShort, `${p}.data.heading`);
      optStr(d.intro, LIMITS.textMedium, `${p}.data.intro`);
      optStr(d.footnote, LIMITS.textMedium, `${p}.data.footnote`);
      arr(d.branches, `${p}.data.branches`, (b, j) => {
        const bp = `${p}.data.branches[${j}]`;
        str(b.id, LIMITS.textShort, `${bp}.id`);
        str(b.name, LIMITS.textShort, `${bp}.name`);
        optStr(b.desc, LIMITS.textMedium, `${bp}.desc`);
        if (b.waze) {
          if (typeof b.waze.lat !== "number" || typeof b.waze.lng !== "number")
            E(`${bp}.waze lat/lng must be numbers`);
        }
        if (b.hours && typeof b.hours === "object") {
          for (const day of Object.keys(b.hours)) {
            if (!/^[0-6]$/.test(day)) E(`${bp}.hours key "${day}" must be 0-6`);
            const h = b.hours[day];
            if (h !== null && (!Array.isArray(h) || h.length !== 2 ||
              typeof h[0] !== "number" || typeof h[1] !== "number"))
              E(`${bp}.hours[${day}] must be [open,close] or null`);
          }
        }
      });
      break;
    case "social":
      optStr(d.heading, LIMITS.textShort, `${p}.data.heading`);
      optStr(d.intro, LIMITS.textMedium, `${p}.data.intro`);
      arr(d.links, `${p}.data.links`, (l, j) => {
        const lp = `${p}.data.links[${j}]`;
        if (!SOCIAL_NETWORKS.has(l.network)) E(`${lp}.network "${l.network}" not allowed`);
        str(l.label, LIMITS.textShort, `${lp}.label`);
        href(l.url, `${lp}.url`);
      });
      break;
  }
}

export { LIMITS };
