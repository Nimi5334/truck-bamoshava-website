# Google Stitch — Master Prompt (Bench CMS)

Paste the block below into Stitch as your first prompt to establish the whole system. Then use the three follow-up prompts (Screen 2, 3, 4) inside the *same* Stitch project so it keeps the style consistent across screens — don't start new projects for each screen.

---

## PROMPT 1 — System + Screen 1 (Content List Dashboard)

```
Design a dark-mode-first CMS dashboard for small local businesses — food trucks and
private dental clinics — who log in for 60-90 seconds at a time to fix a price, a menu
item, or a phone number, then leave. This is a professional power-user tool, not a
marketing site: think of it as a mechanic's workshop bench, not a magazine layout.
Dense, precise, confident. Full Hebrew RTL layout (right-to-left, Hebrew UI copy),
with Latin numerals, prices, and phone numbers rendered left-to-right inside the RTL
flow so they never scramble or reverse.

MOOD: Calm, controlled, near-monochrome. Feels like flight-deck software for someone
who is not a designer — trustworthy, fast, zero clutter, zero decoration. Not playful,
not corporate-sterile either — warm charcoal tones, not cold gray.

COLOR PALETTE (use exactly these):
- Deep Charcoal Canvas (#0B0B0D) — main background, never pure black
- Slate Surface (#17171A) — table rows and base panels
- Raised Panel (#1F1F23) — modals, drawers, popovers
- Hairline Border (#2A2A2F) — thin 1px dividers between rows, no shadows for separation
- Primary Text (#EDEDEF) — high-contrast off-white
- Secondary Text (#9A9AA2) — muted gray for labels, timestamps, metadata
- Focus Blue (#3D8BFF) — the ONE action color: primary buttons, active nav item,
  links, focus rings, "save" states
- Warm Amber (#E8A33D) — the ONE attention color: unsaved-change indicators, stale
  content warnings, "needs review" badges
- Alert Red (#E5484D) — reserved ONLY for a destructive confirmation dialog (delete,
  unpublish). It must never appear in the main dashboard, nav, or table rows —
  its rarity is what makes it feel dangerous when it shows up.
No gradients. No glassmorphism. No glowing shadows. No purple or neon anywhere.

TYPOGRAPHY: Use Heebo (Google Font) for all Hebrew and English UI text — it has
matched Hebrew/Latin metrics so mixed strings don't clash. Use JetBrains Mono
(Google Font) for every number: prices, phone numbers, timestamps, stats — so
number columns align like a ledger. Keep a tight 5-size type scale: 12px labels,
14px body, 16px section headers, 20px page titles, 28px monospace hero numbers
(used only for the traffic count on the dashboard). Weight and color create
hierarchy, not size — avoid huge screaming headlines.

LAYOUT: Right-anchored icon+label navigation rail (Dashboard, Content, Site,
Settings) — narrow, icon-first, always visible. Do NOT design a top horizontal
navbar. Include a floating command-palette trigger (search icon, "⌘K חיפוש מהיר")
top-center — this is the primary way users jump around, more important visually
than the rail itself.

MAIN SCREEN TO GENERATE — Content List (e.g. a food-truck menu / price list):
A dense virtualized table, compact 36px rows, built to stay perfectly readable
even with 500+ rows. Columns from right to left (RTL reading order): a thin 3px
color-coded "freshness" indicator bar on the far right edge of each row (green
solid = updated recently, amber dashed = getting stale, red hatched = needs
attention — this must be readable by shape/pattern, not color alone), a status
icon+label, item name in Hebrew, category tag, price in monospace font aligned
as a clean column, "last verified" relative timestamp, and a three-dot overflow
menu on the far left. Above the table: a single search bar (not a filter panel)
and a small stat strip showing total items, items needing attention, and a live
traffic sparkline for the business's site — this stat strip is the one area
allowed to feel a little alive and worth checking daily, small motion on the
sparkline, monospace numerals ticking.
Include a default sort toggle "הכי דחוף קודם" (most urgent first) that sorts by
the freshness indicator, not alphabetically.
Row hover shows a subtle 6px-radius background lightening, no shadow. Clicking a
row does not navigate away — it should look like it will open a side panel from
the right edge without covering the whole screen.
```

---

## PROMPT 2 — Screen 2 (Item Editor Drawer)

```
Now generate the item editor that slides in from the right edge of the previous
screen when a row is clicked, keeping the list visible and dimmed behind it.
Single-column form, label above each input, Hebrew labels, helper text below
inputs where needed, error text in Alert Red only when truly invalid. Dedicated,
visually distinct fields for phone number and price (monospace, boxed, clearly
different from the plain text name field below them) — these are the two fields
where a mistake actually costs the business money or a missed customer call.
At the top of the drawer show an amber "שינויים לא נשמרו" (unsaved changes) pill
that only appears after an edit — subtle scale-in animation, not a jarring pop.
Bottom of the drawer: one primary Focus Blue "שמור ופרסם" (save & publish) button
and one ghost-style secondary "ביטול" (cancel) button — never a red button on
this screen. Keep it calm, fast, and obviously safe to use.
```

---

## PROMPT 3 — Screen 3 (Publish Diff / Review)

```
Generate a lightweight before/after diff screen shown right before a change goes
live on the public site. Show only the fields that actually changed — old value
struck through in muted gray, new value highlighted in Focus Blue — unchanged
fields are not shown at all, so even a long form produces a short, scannable
diff. One large primary button "פרסם עכשיו" (publish now) in Focus Blue, and one
secondary ghost button "תזמן לפרסום" (schedule) that would open a date picker.
No approval-chain UI, no "submitted for review" state — this is a solo business
owner, not a team, so the diff itself is the only safety check, and it should
feel reassuring rather than bureaucratic. Keep the destructive "בטל שינוי"
(revert) action tucked inside a small overflow menu, never as a button next to
"publish now."
```

---

## PROMPT 4 — Screen 4 (Empty / Loading / Error states)

```
Generate the empty state, loading state, and error state for the content list
table from the first screen, in the same dark charcoal system.
Empty state: one simple line-art illustration (a truck or a folder, abstract,
not a stock icon), one sentence in Hebrew ("עדיין אין פריטים ברשימה"), one
primary Focus Blue button ("הוסף פריט ראשון") — no secondary link.
Loading state: skeleton rows at the exact same 36px height as real rows, with a
soft horizontal shimmer only across the text areas — no centered spinner icon
anywhere in the product.
Error state: a single inline red text line directly under the field that failed,
never a full-screen error page or a disruptive modal for row-level errors.
```

---

### Notes for you (not for Stitch)
- Feed these four prompts into the *same* Stitch project, one after another, so it carries style memory forward instead of starting fresh each time.
- If Stitch drifts on Hebrew RTL mirroring (it sometimes does), the fastest fix is to literally re-paste the line "Full Hebrew RTL layout, right-to-left" as a follow-up correction prompt rather than re-describing the whole system.
- The engagement play isn't the editing screens — it's the traffic sparkline + freshness sort. That's the part worth polishing hardest if you want people opening this daily out of curiosity, not obligation.
