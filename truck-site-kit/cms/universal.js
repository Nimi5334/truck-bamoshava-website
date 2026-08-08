/**
 * Universal site ingestion — makes an arbitrary uploaded static site editable
 * without reshaping it into the truck-site-kit template.
 *
 * Each HTML page is parsed into a live `DOMParser` Document that stays alive
 * for the whole editing session. Detected fields are bound to the actual DOM
 * node (closures over `get`/`set`), never to a reconstructed CSS-selector
 * path — a selector like `nav > ul > li:nth-child(3) > a` breaks the moment
 * sibling structure shifts; a live node reference can't drift, because it
 * *is* the element. Edits mutate the node in place; Publish serializes the
 * already-mutated Document.
 *
 * `state.site` (which gets JSON.stringify'd for drafts) never holds these
 * live nodes — it only holds serializable `{id,type:"dynamic",data:{label,
 * fieldIds}}` stubs. The actual get/set closures live in the `registry`
 * object returned alongside them, kept out of anything ever serialized.
 */

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "IFRAME", "CANVAS", "OBJECT", "EMBED", "HEAD"]);
const NEVER_LEAF_GENERIC = new Set(["INPUT", "SELECT", "OPTION", "TEXTAREA", "IMG", "A"]);
const STATE_CLASSES = new Set(["active", "current", "selected", "open", "expanded", "disabled", "hidden", "visible"]);
const ZONE_TAGS = new Set(["HEADER", "NAV", "MAIN", "FOOTER", "SECTION", "ARTICLE", "ASIDE"]);

const hasLetterOrDigit = (s) => !!(s && /[\p{L}\p{N}]/u.test(s.trim()));

function classSignature(el) {
  const cls = el.getAttribute("class");
  if (!cls) return "";
  return cls.split(/\s+/).filter((c) => c && !STATE_CLASSES.has(c.toLowerCase())).sort().join(" ");
}

function findRepeatedRuns(el) {
  const children = [...el.children].filter((c) => !SKIP_TAGS.has(c.tagName));
  const runs = [];
  let i = 0;
  while (i < children.length) {
    const tag = children[i].tagName;
    const sig = classSignature(children[i]);
    let j = i + 1;
    while (j < children.length && children[j].tagName === tag && classSignature(children[j]) === sig) j++;
    if (j - i >= 2) runs.push(children.slice(i, j));
    i = j > i ? j : i + 1;
  }
  return runs;
}

function isGenericTextLeaf(el) {
  return el.children.length === 0 && !NEVER_LEAF_GENERIC.has(el.tagName) && hasLetterOrDigit(el.textContent);
}

function humanize(s) {
  return s.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim() || s;
}

function inferFieldLabel(el, kind, index) {
  const aria = el.getAttribute && el.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  if (kind === "image") {
    const alt = el.getAttribute("alt");
    if (alt && alt.trim()) return alt.trim();
  }
  const text = (el.textContent || "").trim();
  if (text) return text.length > 40 ? text.slice(0, 40) + "…" : text;
  return (kind === "image" ? "תמונה" : "טקסט") + " " + (index + 1);
}

function inferGroupLabel(elements) {
  const first = elements[0];
  const aria = first.getAttribute && first.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  const sig = classSignature(first);
  if (sig) return humanize(sig.split(" ")[0]);
  return `רשימה (${elements.length} פריטים)`;
}

function withPage(label, pageLabel) {
  return pageLabel ? `${pageLabel} — ${label}` : label;
}

function inferZoneLabel(elements, index, pageLabel) {
  for (const el of elements) {
    const aria = el.getAttribute && el.getAttribute("aria-label");
    if (aria && aria.trim()) return withPage(aria.trim(), pageLabel);
  }
  for (const el of elements) {
    const h = el.querySelector && el.querySelector("h1,h2,h3");
    if (h && hasLetterOrDigit(h.textContent)) return withPage(h.textContent.trim().slice(0, 60), pageLabel);
  }
  for (const el of elements) {
    const img = el.querySelector && el.querySelector("img[alt]");
    const alt = img && img.getAttribute("alt");
    if (alt && alt.trim()) return withPage(alt.trim(), pageLabel);
  }
  for (const el of elements) {
    const key = el.id || (el.getAttribute("class") || "").split(/\s+/)[0] || el.tagName.toLowerCase();
    if (key) return withPage(humanize(key), pageLabel);
  }
  return withPage(`אזור ${index + 1}`, pageLabel);
}

/* ---------------- zones ---------------- */
function collectZoneContainers(root) {
  const containers = [];
  (function walk(node) {
    for (const child of [...node.children]) {
      if (ZONE_TAGS.has(child.tagName)) {
        const nested = [...child.children].filter((c) => ZONE_TAGS.has(c.tagName));
        if (nested.length > 0) {
          // Split into the nested zone tags (their own zones) plus whatever
          // else lives directly in this container (e.g. a logo link sitting
          // next to a <nav> inside <header>) — don't just discard it.
          const leftover = [...child.children].filter((c) => !ZONE_TAGS.has(c.tagName));
          if (leftover.length > 0) containers.push({ pseudo: true, elements: leftover });
          nested.forEach((n) => containers.push(n));
        } else {
          containers.push(child);
        }
      } else {
        walk(child);
      }
    }
  })(root);
  return containers;
}

// div-soup fallback: split a large top-level block at its own h1/h2/h3 boundaries.
function splitAtHeadings(container) {
  const headings = [...container.children].filter((c) => /^H[1-3]$/.test(c.tagName));
  if (headings.length < 2) return [{ elements: [container] }];
  const groups = [];
  let current = null;
  for (const child of container.children) {
    if (headings.includes(child)) {
      if (current) groups.push(current);
      current = { elements: [child] };
    } else if (current) {
      current.elements.push(child);
    }
  }
  if (current) groups.push(current);
  return groups;
}

function collectZones(doc) {
  const body = doc.body;
  if (!body) return [];
  const containers = collectZoneContainers(body);
  if (containers.length > 0) return containers.map((c) => (c && c.pseudo ? { elements: c.elements } : { elements: [c] }));
  return [...body.children].flatMap((el) => splitAtHeadings(el));
}

/* ---------------- serialization ---------------- */
function serializeDocument(doc) {
  const doctype = doc.doctype ? `<!doctype ${doc.doctype.name}>` : "<!doctype html>";
  return doctype + "\n" + doc.documentElement.outerHTML;
}

/**
 * @param {Map<string,{kind:'text'|'binary',file:File,text?:string}>} fileMap
 * @param {{rootPath:string, otherHtmlPaths?:string[]}} opts
 */
export function analyzeSite(fileMap, { rootPath, otherHtmlPaths = [] }) {
  let counter = 0;
  const nextId = (p) => `${p}-${counter++}`;
  const fields = new Map();
  const claimed = new Set();
  const docs = new Map();
  const mutatedDocs = new Set();
  const sections = [];

  const htmlPaths = [rootPath, ...otherHtmlPaths.filter((p) => p !== rootPath)];
  for (const path of htmlPaths) {
    const entry = fileMap.get(path);
    if (!entry || entry.kind !== "text") continue;
    docs.set(path, new DOMParser().parseFromString(entry.text, "text/html"));
  }

  const reg = (kind, label, docPath, accessor) => {
    const id = nextId(kind[0]);
    fields.set(id, { kind, label, docPath, get: accessor.get, set: accessor.set });
    return id;
  };

  // Tries to register `el` itself as one field; if it doesn't match any known
  // pattern, falls through to walk() so its children get a chance instead.
  function registerLeafOrRecurse(el, sink, ctx) {
    if (!el || claimed.has(el) || SKIP_TAGS.has(el.tagName)) return;

    if (el.tagName === "IMG") {
      claimed.add(el);
      sink.push(reg("image", inferFieldLabel(el, "image", sink.length), ctx.docPath, {
        get: () => el.getAttribute("src") || "",
        set: (v) => el.setAttribute("src", v),
      }));
      sink.push(reg("text", "תיאור תמונה (alt)", ctx.docPath, {
        get: () => el.getAttribute("alt") || "",
        set: (v) => el.setAttribute("alt", v),
      }));
      return;
    }

    if (el.tagName === "A" && el.hasAttribute("href")) {
      const label = inferFieldLabel(el, "text", sink.length);
      sink.push(reg("text", label + " — קישור", ctx.docPath, {
        get: () => el.getAttribute("href") || "",
        set: (v) => el.setAttribute("href", v),
      }));
      const isLeaf = el.children.length === 0;
      if (isLeaf && hasLetterOrDigit(el.textContent)) {
        claimed.add(el);
        sink.push(reg("text", label + " — טקסט", ctx.docPath, {
          get: () => el.textContent,
          set: (v) => { el.textContent = v; },
        }));
        return;
      }
      walk(el, sink, ctx); // not a leaf (e.g. wraps an <img>) — keep looking inside
      return;
    }

    if (el.tagName === "INPUT" && /^(submit|button)$/i.test(el.type)) {
      claimed.add(el);
      sink.push(reg("text", inferFieldLabel(el, "text", sink.length), ctx.docPath, {
        get: () => el.value,
        set: (v) => { el.value = v; },
      }));
      return;
    }

    if (isGenericTextLeaf(el)) {
      claimed.add(el);
      sink.push(reg("text", inferFieldLabel(el, "text", sink.length), ctx.docPath, {
        get: () => el.textContent,
        set: (v) => { el.textContent = v; },
      }));
      return;
    }

    const style = el.getAttribute("style") || "";
    const bgMatch = /background-image\s*:\s*url\((['"]?)(.*?)\1\)/i.exec(style);
    if (bgMatch) {
      sink.push(reg("image", inferFieldLabel(el, "image", sink.length), ctx.docPath, {
        get: () => {
          const cur = el.getAttribute("style") || "";
          const m = /background-image\s*:\s*url\((['"]?)(.*?)\1\)/i.exec(cur);
          return m ? m[2] : "";
        },
        set: (v) => {
          const cur = el.getAttribute("style") || "";
          const escaped = String(v).replace(/'/g, "%27");
          el.setAttribute("style", cur.replace(/background-image\s*:\s*url\([^)]*\)/i, `background-image:url('${escaped}')`));
        },
      }));
    }

    walk(el, sink, ctx);
  }

  function walk(el, sink, ctx) {
    if (!el || claimed.has(el) || SKIP_TAGS.has(el.tagName)) return;

    const runs = findRepeatedRuns(el);
    const runEls = new Set(runs.flat());
    for (const run of runs) {
      // Note: items are NOT pre-added to `claimed` here — registerLeafOrRecurse
      // needs to walk *into* each item's own children to find its fields, and
      // claimed's guard would block that. `runEls` already keeps the sibling
      // loop below from re-visiting these same elements as top-level fields.
      const items = run.map((item) => {
        const itemFieldIds = [];
        registerLeafOrRecurse(item, itemFieldIds, ctx);
        return { id: nextId("item"), fieldIds: itemFieldIds };
      });
      if (items.some((it) => it.fieldIds.length > 0)) {
        sink.push(reg2Group(inferGroupLabel(run), items));
      }
    }

    for (const child of [...el.children]) {
      if (claimed.has(child) || runEls.has(child)) continue;
      registerLeafOrRecurse(child, sink, ctx);
    }
  }

  function reg2Group(label, items) {
    const id = nextId("group");
    fields.set(id, { kind: "group", label, items });
    return id;
  }

  for (const [path, doc] of docs) {
    const pageLabel = htmlPaths.length > 1 ? (doc.title || path).trim() : null;
    const zones = collectZones(doc);
    zones.forEach((zone, i) => {
      const sink = [];
      const ctx = { docPath: path };
      for (const el of zone.elements) registerLeafOrRecurse(el, sink, ctx);
      if (sink.length === 0) return;
      sections.push({
        id: nextId("zone"),
        type: "dynamic",
        visible: true,
        data: { label: inferZoneLabel(zone.elements, sections.length, pageLabel), fieldIds: sink },
      });
    });
  }

  const registry = {
    getFieldValue(id) {
      const f = fields.get(id);
      return f && f.get ? f.get() ?? "" : "";
    },
    setFieldValue(id, v) {
      const f = fields.get(id);
      if (!f || !f.set) return;
      f.set(v ?? "");
      if (f.docPath) mutatedDocs.add(f.docPath);
    },
    getFieldMeta(id) {
      const f = fields.get(id);
      if (!f) return null;
      if (f.kind === "group") return { kind: "group", label: f.label, items: f.items };
      return { kind: f.kind, label: f.label, docPath: f.docPath };
    },
  };

  return { docs, sections, registry, mutatedDocs, fileMap };
}

/**
 * Reassembles the folder for download: pages the user actually edited are
 * re-serialized from their (mutated) live Document; every other file — every
 * untouched HTML page, every CSS/JS file, every binary asset — passes
 * through as its original bytes, unmodified. This confines the one real
 * fidelity risk (outerHTML re-serialization isn't guaranteed byte-identical)
 * strictly to pages that were genuinely touched.
 * @returns {Promise<{path:string,data:Uint8Array}[]>}
 */
export async function serializeForZip(analysis) {
  const encoder = new TextEncoder();
  const entries = [];
  for (const [path, fileEntry] of analysis.fileMap) {
    if (analysis.mutatedDocs.has(path) && analysis.docs.has(path)) {
      entries.push({ path, data: encoder.encode(serializeDocument(analysis.docs.get(path))) });
    } else if (fileEntry.kind === "text") {
      entries.push({ path, data: encoder.encode(fileEntry.text) });
    } else {
      entries.push({ path, data: new Uint8Array(await fileEntry.file.arrayBuffer()) });
    }
  }
  return entries;
}
