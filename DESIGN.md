# Design System: Bench — CMS for Food Trucks & Dental Clinics

## 0. Design Thesis

This interface is a workshop bench, not a newsroom desk: tools live where the hand expects them, nothing is decorative, and every object on the bench is picked up, used, and put back in one motion. The user is a food-truck owner or a dental-clinic manager who opens this three times a day for ninety seconds — fix a price, swap a menu item, correct a phone number — then closes it and goes back to running the actual business. Every screen is built for that ninety-second window: scan, locate, edit, confirm, leave.

We are deliberately **not** building an editorial workspace for someone who lives in the tool all day. No multi-pane authoring canvas, no draft/versioning ceremony, no onboarding tours, no "workspace" you settle into. Density here doesn't serve long dwell time — it serves the opposite: a compact 500-row list gets scanned and fixed in fewer scrolls, which is what makes a 90-second visit possible in the first place. Everything downstream in this document traces back to that: workshop-bench economy of motion, not comfort.

---

## 1. Design Tokens

### 1.1 Color

Dark mode is the default surface. Light mode is a real second design (§1.1.3), not an inverted dark theme.

**Neutrals (dark, default)**

| Token | Hex | Role |
|---|---|---|
| `bg-canvas` | `#0B0B0D` | App background. Not pure black — reduces OLED smear and halation against white content thumbnails. |
| `bg-surface` | `#17171A` | Table rows, base cards, rail. |
| `bg-raised` | `#1F1F23` | Drawers, modals, popovers, command palette. |
| `border` | `#2A2A2F` | Default hairline dividers, row separators. |
| `border-strong` | `#38383F` | Focus rings, active-input borders, section dividers. |
| `text-primary` | `#EDEDEF` | Row text, field values, headings. |
| `text-secondary` | `#9A9AA2` | Labels, metadata, timestamps, placeholder. |
| `text-tertiary` | `#5C5C64` | Disabled text, hint text. |

**Semantic accents — two govern daily use, one is reserved**

| Token | Hex | Role |
|---|---|---|
| `accent-action` | `#3D8BFF` | Primary buttons, links, active nav item, focus ring, "save" affordance. Desaturated blue, no glow. |
| `accent-attention` | `#E8A33D` | Unsaved changes, stale content, needs-review, warning banners. Amber, never confused with destructive. |
| `accent-destructive` | `#E5484D` | **Reserved.** Appears only inside delete/unpublish confirmation dialogs and the destructive button itself — never in list chrome, nav, or status chips. |

The brief caps accents at two ("one action, one attention"). Destructive red is not a third accent in continuous rotation — it's quarantined to a single context (the danger zone), so the palette a user sees 99% of the time genuinely is two colors. Its rarity is the signal: red means "you are one click from breaking something a customer will notice," and it never shows up anywhere else, so it can't be desensitized by overuse. This is the one place the brief's letter (max 2 accents) and its intent (color carries real semantic weight) pointed in different directions, and intent wins.

**Neutrals (light mode)**

| Token | Hex | Role |
|---|---|---|
| `bg-canvas` | `#F4F4F5` | App background. |
| `bg-surface` | `#FFFFFF` | Rows, cards. |
| `bg-raised` | `#FFFFFF` + shadow | Drawers, modals. |
| `border` | `#E4E4E7` | Hairlines. |
| `border-strong` | `#D4D4D8` | Focus, dividers. |
| `text-primary` | `#18181B` | Zinc-950, not pure black. |
| `text-secondary` | `#71717A` | Metadata. |
| `text-tertiary` | `#A1A1AA` | Disabled. |

Accents keep the same hex values in light mode; blue and amber both hold sufficient contrast on white without retuning, so there's one accent definition, not two per theme.

### 1.2 Typography

- **UI text (Hebrew + Latin): `Heebo`** — one of the few open-source families drawn specifically for Hebrew with Latin metrics matched to it, so mixed strings (a clinic's English brand name inside a Hebrew sentence, "פתוח 09:00–18:00") don't clash in weight or x-height the way system-font Hebrew stacks usually do.
- **Numbers, prices, phone numbers, timestamps: `JetBrains Mono`** — every digit column, in either reading direction, gets fixed-width alignment, so 500 prices scan as a column instead of ragged text, and phone numbers don't visually "breathe" as you scroll.
- Inter is banned. Generic serif is banned; no serif appears anywhere in this system — this is a dashboard, not an editorial surface.

**Type scale — 5 sizes, no more**

| Token | Size / Line-height | Font | Use |
|---|---|---|---|
| `text-xs` | 12px / 16px | Heebo / JetBrains Mono | Metadata, table secondary line, timestamps |
| `text-sm` | 14px / 20px | Heebo | Body, table primary cell, button label |
| `text-md` | 16px / 24px | Heebo | Section headers, input values, modal body |
| `text-lg` | 20px / 28px | Heebo, weight 600 | Page titles, modal titles |
| `text-xl` | 28px / 34px | JetBrains Mono, weight 500 | Dashboard hero numbers (traffic count) — the only large numeral on the whole product |

Hierarchy comes from weight (400/500/600) and `text-secondary` vs `text-primary`, not from adding more sizes.

### 1.3 Spacing scale

Base 4px grid: `4, 8, 12, 16, 24, 32, 48`. List rows use the tight end (4/8/12); modals and empty states use the loose end (24/32/48). No value outside this set.

### 1.4 Radii

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 4px | Inputs, chips, small buttons |
| `radius-md` | 6px | Buttons, table row hover state, cards |
| `radius-lg` | 10px | Modals, drawers, command palette |

No radius above 10px anywhere. Generously-rounded 2.5rem cards belong to marketing sites, not a tool someone uses 500 times a month — soft corners read as "content," not "control."

### 1.5 Border & elevation treatment

1px hairline borders (`border`/`border-strong`) are the primary way surfaces separate from each other — not shadows. Shadows exist as exactly one token, `shadow-raised`: `0 4px 16px rgba(0,0,0,0.4)` (dark) / `rgba(24,24,27,0.12)` (light), used only on drawers, modals, and the command palette — i.e., only where something is genuinely floating above the canvas. Table rows, buttons, and chips never carry a shadow. No gradients, no glassmorphism, anywhere.

---

## 2. Layout Architecture

**Navigation model: persistent icon+label rail + command palette as the actual primary nav surface.**

The rail (4 items: Dashboard, Content, Site, Settings) exists for orientation and muscle memory — a user glancing at the screen after not opening the tool for two weeks should immediately know where they are. But the rail is not how fast users navigate; **⌘K / Ctrl+K** is. Typing "menu" or "מחיר" (price) and hitting Enter beats three rail clicks, and it's the only navigation model that stays flat as content types grow — a top nav or breadcrumb trail would need new tiers as the product adds content types, while the palette just gets more entries in its index.

We reject a top horizontal nav (wastes vertical space in a tool whose entire value is vertical list density) and breadcrumbs-as-primary-nav (breadcrumbs answer "where am I," not "get me there fast" — useful as a secondary trail inside the editor, useless as the main way to move).

**RTL layout rules:**
- `dir="rtl"` at document root; all spacing/positioning uses CSS logical properties (`margin-inline-start/end`, `inset-inline-start/end`) — never physical `left`/`right`.
- Directional icons (back arrows, chevrons, "next") mirror. Non-directional icons (search, trash, check, star) do not.
- The rail sits on the reading-start edge (right, in RTL). Drawers open from the same edge, preserving the list underneath instead of covering it from the "wrong" side.
- Row navigation shortcuts use `↑/↓` only — never `←/→` — so their meaning ("previous/next row") never has to be remapped per direction.
- Every numeral, phone number, price, and URL is wrapped in `dir="ltr"; unicode-bidi: isolate`, regardless of surrounding Hebrew, so `050-123-4567` or `₪1,240` never reverses or collides with adjacent Hebrew punctuation. This is enforced at the component level (`<Numeral>`, `<Phone>`, `<Price>` components), not left to page-level dir handling.
- Latin-script content (an English clinic brand name, an imported English menu item) gets the same per-string isolation rather than manual character reversal — the LTR fallback is structural, not a special case someone has to remember to add.

---

## 3. Core Screens

### 3.1 Content list (e.g., price list / menu)

- Virtualized table, 36px row height, 12px horizontal cell padding. Renders identically whether the list has 12 rows or 12,000 — only the scrollbar length changes.
- Columns (reading-start to reading-end in RTL): **Freshness Rail** (3px, see §4) · **Status** (icon + label, never color-only) · **Name** (Heebo, `text-sm`) · **Category** · **Price** (`Numeral`/`Price` component, JetBrains Mono, LTR-isolated) · **Last edited** (`text-xs`, relative + absolute on hover) · **Actions** (overflow menu, `⋯`).
- Row click opens an inline **side drawer** from the reading-start edge — the list underneath keeps its scroll position. Full navigation to a separate route is reserved for the handful of content types too large for a drawer (§3.2).
- Search/filter bar is a single input, not a filter panel; typing routes into the same fuzzy index the command palette uses, so "the way you find something" is one mental model everywhere in the product.
- Sort defaults to "most stale first," not alphabetical — the list itself nudges the 90-second visit toward the thing most likely to be wrong.

**States:**
- *Loading:* skeleton rows at the exact 36px height with shimmer on the text regions only — no centered spinner, so the layout doesn't jump when data arrives.
- *Empty:* a single composed illustration + one sentence ("No menu items yet") + one primary button ("Add item"). No secondary link.
- *Error (row-level):* an inline `text-xs` red line under the offending cell, not a toast — errors that vanish are errors a food-truck owner will re-make tomorrow.

### 3.2 Single-item editor (drawer, or full route for large content types)

- Drawer variant (price, single menu item, single FAQ line): field stack in a single column, label above input, helper text optional, error text below in `text-sm` red — no floating labels, no side-by-side label/input (RTL bidi risk with short Hebrew labels next to LTR numeric inputs).
- Full-route variant (landing page: hours, phone, location, description, photos): same single-column field stack, but a persistent mini field-map sits on the reading-start edge — not a breadcrumb, a jump-list ("Contact," "Hours," "Location," "Photos") since this is the one screen where "many fields" genuinely happens.
- Phone, price, and hours fields are dedicated components (`PhoneInput`, `PriceInput`, `HoursInput`) — never raw text inputs — because these are the fields where a wrong keystroke costs the business a missed call or a wrong charge.
- Save is explicit (a button, not autosave-on-blur) for anything that will go live on the public site; the amber `accent-attention` "unsaved changes" chip persists in the drawer header until the user acts, so nothing quietly reverts if they close the drawer by mistake.

### 3.3 Publish / review flow

For this audience "publish" means "push this change to the live site a customer might be looking at right now," so the flow is a **diff, not a workflow**:
- Left/right (logically: before/after) comparison of exactly what changed — old price struck through, new price in `accent-action`, unchanged fields not shown at all, to keep the diff short even when the source form was long.
- One primary action, **"Publish now"** (`accent-action` fill), and one secondary, **"Schedule"** (ghost button, opens a date/time picker — for known future changes like a seasonal menu price).
- No "submit for review" state, no approval chain — there's no one else in the org to approve it. The diff view itself is the review; it exists so a non-technical owner can catch a typo before it's live, not so a second person can gatekeep it.
- Destructive-adjacent action ("Unpublish" / "Revert to previous") lives inside the overflow menu (`⋯`) on this screen, never as a button next to "Publish now" — satisfying the non-negotiable that destructive and common actions can't be spatially adjacent.

---

## 4. The Freshness Rail (signature detail)

A 3px vertical bar on the reading-start edge of every row and every field, encoding **time since last verified** — not time since created, time since a human last confirmed it's still true:

- Solid green: verified within 7 days.
- Dashed amber: 30–90 days.
- Dense red hatch: 90+ days, unverified.

Color and pattern both carry the signal (hatch density, not just hue), so it reads correctly for colorblind users and holds up under the "status without color alone" constraint. Functionally, it turns a 500-row list from something you'd have to audit field-by-field into something you can sort by: default sort is "most stale first," so the food-truck owner's 90 seconds go to the seven prices nobody's looked at since spring, not the one they happened to click on. No other CMS in this space surfaces data *decay* as a first-class, sortable property — it's the one thing on the bench that answers "where should I actually spend my ninety seconds," which is the entire thesis of the product.

---

## 5. Component Inventory

`VirtualizedTable` / `Row` · `FreshnessRail` · `StatusChip` (icon+label+shape, not color-only) · `SideDrawer` · `FieldMap` (jump-list nav for the full-route editor) · `Input` / `TextArea` · `PhoneInput` · `PriceInput` · `HoursInput` · `LocationPicker` · `DatePicker` · `Select` · `Toggle` · `ButtonPrimary` / `ButtonSecondary` / `ButtonGhost` / `ButtonDestructive` (visually distinct: outlined red, never filled, never adjacent to `ButtonPrimary`) · `CommandPalette` · `Toast` · `DiffView` · `ConfirmDialog` (only place `accent-destructive` fills a surface) · `EmptyState` · `SkeletonRow` · `InlineFieldError` · `TrafficSparkline` (dashboard only, JetBrains Mono numerals) · `Numeral` / `Price` (bidi-isolated primitives used inside every other component that renders a number).

---

## 6. Failure mode at 10x scale

At 5,000 rows instead of 500, rendering doesn't degrade — the table is already virtualized at 36px fixed row height, so windowed rendering costs the same whether the list is 500 or 50,000 rows long. What breaks first is *findability*, not performance, so the design leans harder on primitives that already exist rather than introducing new ones: the command palette stops being a convenience and becomes the primary retrieval method, since fuzzy-searching for a name beats scrolling past thousands of rows; saved filters (already present as an affordance in §3.1) become something the product should proactively suggest rather than leave optional; and the Freshness Rail's default "most stale first" sort becomes load-bearing rather than a nice-to-default, because at that scale a human will never eyeball their way to what's wrong — the sort has to do it for them. No new screen, no new interaction paradigm, no pagination-vs-infinite-scroll debate — the same three primitives (virtualized table, palette, freshness sort) just get used more aggressively as the list grows.

---

## 7. Anti-Patterns (Banned)

No emojis. No Inter. No generic serif anywhere (this is a dashboard — no serif at all, distinctive or otherwise). No pure black (`#000000`). No neon or outer-glow shadows. No oversaturated accents beyond the three defined hexes. No decorative gradients, no glassmorphism, no shadow used as ornament (shadow exists only on floating surfaces, §1.5). No circular loading spinners — skeleton rows only, matched to exact row height. No status communicated by color alone. No destructive action placed adjacent to a common action. No autosave silently overwriting a field the user is mid-edit on. No generic placeholder content ("Item 1," "Business Name") in empty/demo states — use real category language ("שניצל בפיתה," "ניקוי אבנית") so the interface never looks like a template screenshot. No AI-copywriting clichés in UI copy ("Elevate your menu," "Seamless publishing"). No filler UI text — no "scroll for more," no bouncing chevrons.
