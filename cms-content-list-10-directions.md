# CMS Content List — 10 Visual Directions

**Fixed across all 10:** same screen, same data. Item title · status (draft / published / needs review) · last edited · quick actions.
**Audience:** dental clinics, food trucks, corner shops. Daily tool, not a landing page.
**Banned (AI-default cluster):** cream+serif+terracotta · near-black+acid-green/vermilion · broadsheet hairline newspaper.

Balance: 5 light / 5 dark. No repeated display pairing. No repeated accent family.

---

## 1. The Pharmacy Pickup Rail — LIGHT

**Thesis.** A pharmacist doesn't hunt through a list; the bags that need action are physically racked at the front and everything else is filed behind. A shop owner should see "these 2 need you" before they see "these 40 exist."

**Color**
- `#FBFBF9` canvas — paper-white, slightly warm but *not* cream (no ochre in it)
- `#1B1F24` ink — body text, 15.8:1
- `#5C6470` label — secondary meta, 5.6:1 on canvas
- `#C22B45` flag rose — needs-review only. Never used decoratively.
- `#E3E7E2` divider — bag-to-bag separation
- `#0E7A5F` filled green — published confirmation

**Type.** Display: **Bitter** (slab, used only for the rail header and item titles). Body: **Source Sans 3**. Data: **Courier Prime** for dates + item IDs — reads as a dispensing label, not as "developer terminal."

**Layout.** Two zones stacked, not a single scroll: a pinned "Waiting for you" rail (max 5 rows, taller, 64px) sitting above a quieter filed list (44px rows). Left status column is fixed-width so the eye scans one vertical strip.

**Signature — the tear tab.** Every needs-review row carries a perforated tab on its right edge with the single next action written on it ("Approve the new hours"). Tapping it visually tears off and the row drops into the filed list below. Functional: the tab *names the action*, so there's never an ambiguous icon, and clearing the rail is the whole job.

**Avoided.** Bitter is a slab, deliberately not a high-contrast display serif; the canvas has no yellow warmth and there is no terracotta anywhere.

---

## 2. The Kitchen Pass — DARK

**Thesis.** Food-truck and restaurant owners already run a ticket rail: orders come in, they age, someone calls them, they get bumped. Content items are tickets. Age is the pressure.

**Color**
- `#15171A` steel dark — canvas
- `#1E2126` rail — row surface, one step up
- `#F0F2F5` chalk — body text, 14.9:1
- `#A3AAB4` steam — meta, 7.2:1
- `#F5D90A` ticket yellow — the aging/attention channel only
- `#4FB477` served — published

**Type.** Display: **Archivo Black** (station headers only — "DRAFTS · 4"). Body: **Barlow**. Data: **Barlow Semi Condensed** for times, so the numeric column packs tight without a second family.

**Layout.** Horizontal station bands (Needs Review / In Progress / Live), each band a dense 40px-row block. High density on purpose — 14 rows visible without scrolling.

**Signature — the age bar.** A 3px yellow bar under each row that fills left-to-right the longer an item has sat unedited or unreviewed. Full bar + a printed "Sitting 9 days" label = the loudest thing on screen. And one big **BUMP** button per row = publish. Functional: age is the CMS's real problem (stale hours, old menus) and this makes it the primary visual variable, not status.

**Avoided.** Yellow is a full-saturation warning yellow used as a *gradient/quantity* channel, not the single decorative neon accent of the dark-mode default; the surface is blue-grey steel, not near-black.

---

## 3. The Tide Chart — LIGHT

**Thesis.** Local businesses have rhythms — a menu changes weekly, an about page changes yearly. A tide chart shows what's due to move next rather than treating every row as equally urgent.

**Color**
- `#F2F6F5` shallow — canvas, pale green-blue
- `#14312F` deep — text, 13.4:1
- `#4A6C68` mid — meta, 4.9:1
- `#0C7C74` teal mark — the tide line and primary action
- `#D9463A`… *cut* → `#B0482F` is too close to terracotta. Use `#7A2E6B` **plum** for overdue/needs review (5.9:1)
- `#D5E3E0` band — chart gridlines

**Type.** Display: **Fraunces** at a low-contrast, soft optical setting (titles only, never body). Body: **Karla**. Data: **Space Mono** for dates.

**Layout.** Left 60% is a normal list; right 40% is a shared horizontal time axis where each row's marker sits at its last-edit date. Rows align to the same axis, so the whole content set reads as a single tide line.

**Signature — the waterline.** A vertical "now" line crosses all rows. Anything whose marker has fallen behind its own expected cadence sits below the line and renders in plum with the word "Overdue" spelled out. Functional: it answers "what's gone stale?" — the question a small business owner never thinks to ask.

**Avoided.** Fraunces here is deliberately set soft/low-contrast on a cool green-blue ground with a plum accent — explicitly steered off the cream/high-contrast-serif/terracotta triad. If it starts to feel like that, drop Fraunces for **Newsreader** at optical size 16.

---

## 4. The Sewing Pattern Envelope — LIGHT

**Thesis.** A pattern envelope tells you what's inside, what you still need, and how far along you are — before you commit. A page is a garment in pieces: photos, text, hours, contact.

**Color**
- `#FCFCFE` tissue — canvas, cool white
- `#191A2E` ink — text, 16.1:1
- `#5A5C7A` pencil — meta, 5.4:1
- `#3B2FD6` pattern indigo — cut lines, primary action
- `#E8E8F5` guide — dotted rules
- `#B8341F`… *no.* Incomplete state: `#7C4CC4` light violet fill + a written label

**Type.** Display: **Syne** (screen title + section heads only — its geometric oddness reads as technical drawing). Body: **Work Sans**. Data: **Azeret Mono** for measurements/dates.

**Layout.** Rows are wide "envelopes" (72px) with a left title block and a right notch strip. Dotted indigo rules between rows instead of solid lines — pattern cut lines, but they're 2px dotted with 12px radius corners, nothing hairline or newspaper-like.

**Signature — the notch strip.** Four small notch marks per row, one per required piece (headline, body copy, image, contact info). Filled = present, hollow = missing, and hovering names it in words. Functional: a dentist publishing a page half-empty is the real failure mode; the notches make incompleteness visible before publish, not after.

**Avoided.** Dotted 2px rules + 12px radii, explicitly not the hairline/zero-radius broadsheet look.

---

## 5. The On-Air Radio Console — DARK

**Thesis.** Exactly one thing is broadcasting right now, everything else is queued in the rack. A shop owner's mental model of "live on my website" is exactly this and nothing else.

**Color**
- `#101318` booth — canvas
- `#191E26` module — row surface
- `#EDF0F4` panel text — 14.2:1
- `#98A2B0` legend — 6.4:1
- `#E0338C` on-air magenta — live indicator + faders
- `#3EA8C9` cue blue — queued/draft

**Type.** Display: **Antonio** (condensed, for the ON AIR block and counts). Body: **IBM Plex Sans**. Data: **IBM Plex Mono**.

**Layout.** A fixed top strip — "ON AIR: 12 pages live" — over a rack of module rows, 48px, each with a left channel strip. Two-column: channel controls left, title/meta right.

**Signature — the fader.** Publish state is a physical two-position fader per row, labelled **LIVE** and **OFF AIR** in text, that slides rather than toggles. Needs-review rows have a slow-pulsing magenta cue lamp *and* the words "Check before airing." Functional: sliding is a deliberate, undoable-feeling gesture — it stops accidental publishes, which is the scariest action in the product.

**Avoided.** Magenta is a two-color system with cue blue, not the lone-acid-accent-on-black default; canvas is blue-cast, not near-black.

---

## 6. The Greenhouse Seed Tray — LIGHT

**Thesis.** Content isn't binary done/not-done; it grows. "Draft" feels like failure, "seedling" doesn't. For a non-technical owner this reframes an anxious screen as a tended one.

**Color**
- `#F7F8F3` bench — canvas
- `#20261B` soil — text, 14.7:1
- `#5D6B52` stem — meta, 4.8:1
- `#3F7D20` grow green — healthy/published
- `#C8641C`… too terracotta-adjacent → thirsty state: `#A63A6B` **beetroot** (5.7:1)
- `#E4E9DC` tray edge

**Type.** Display: **Recursive** in Casual mode (headings — handwritten-adjacent without being twee). Body: **Nunito Sans**. Data: **Recursive Mono**.

**Layout.** A tray grid: rows are cells in a 1-column-on-mobile / 2-column-on-desktop tray, 56px, with visible tray dividers. Denser than it looks — the growth icon is 20px, not a hero illustration.

**Signature — the growth stage marker.** Status is a 4-stage seed→sprout→leaf→bloom glyph with the stage word printed beside it (Seed / Growing / Ready / Live). Anything untouched past its cadence gets a beetroot "Needs water" tag pinned to the tray edge, sorted to the top. Functional: four states carry more information than three, and shape alone distinguishes them at a glance for colorblind users.

---

## 7. The Bowling Scoresheet — DARK

**Thesis.** A scoresheet records a sequence of attempts, and open frames are visibly unfinished. Owners edit the same page repeatedly; the history of that is useful, and this makes it legible without a version-control vocabulary.

**Color**
- `#181410` lane dark — canvas, warm-cast brown-black
- `#241E17` frame — row surface
- `#F4EFE7` pin white — text, 13.9:1
- `#A79883` maple — meta, 5.1:1
- `#C08A2E` bronze — open frames, attention
- `#6FA8A0` spare teal — completed/published

**Type.** Display: **Bungee** (used *only* for the screen title and frame numerals — heavy, signage-derived). Body: **Chivo**. Data: **Chivo Mono**.

**Layout.** Each row is a scoresheet line: title left, then a 6-box frame strip right showing the last 6 edit sessions. Boxes are 24px, gridded, very dense — the whole edit history of an item in 150px.

**Signature — the open frame.** The rightmost box is empty and bronze-outlined if the item has unpublished changes, and it literally says "unpublished" on hover. Fill it by publishing. Functional: it answers "did my change actually go live?" — the single most common small-business CMS confusion — in the row itself.

**Avoided.** Warm brown-black lane surface with bronze + teal (a two-accent system) rather than the near-black/single-acid-accent default.

---

## 8. The Hardware Store Key Board — LIGHT

**Thesis.** Hardware stores hang everything on a labelled pegboard: you can see the whole inventory, the gaps, and where a thing belongs. And duplicating an existing key is the normal way to get a new one — which is exactly how a non-technical owner should make a new page.

**Color**
- `#F6F4F1` board — canvas, neutral-warm pegboard
- `#22201D` stencil — text, 15.2:1
- `#63605A` marker — meta, 5.0:1
- `#E2570F` safety orange — needs attention, primary action
- `#2E5FA3` galvanised blue — published
- `#DFDBD4` peg holes

**Type.** Display: **Oswald** (aisle-sign headers). Body: **Asap**. Data: **Roboto Mono** for dates and page counts.

**Layout.** Left rail of category "aisles," main area a dense hook list at 42px rows with a repeating peg-hole texture at 4% opacity. No decorative whitespace — 16+ rows visible.

**Signature — cut a copy.** Every row's primary quick action is **"Cut a copy"**: duplicate this page as the starting point for a new one, pre-filled. Needs-review rows hang on an orange hook with a stamped tag reading the reason ("Phone number changed"). Functional: duplication is how non-technical users actually create; "New page" from blank is where they freeze.

**Avoided.** Orange here is a signage safety orange on a neutral-grey-warm board with a blue counterpart — not terracotta on cream, and there's no serif in the system at all.

---

## 9. The Night Bakery Proof Rack — DARK

**Thesis.** Dough rests, and resting time is the whole craft. A draft that's been sitting three weeks isn't resting, it's forgotten. This direction makes waiting time the primary readout, gently.

**Color**
- `#14161D` night kitchen — canvas
- `#1C1F29` rack — row surface
- `#F1EEE9` flour — text, 14.6:1
- `#9AA0B0` dusk — meta, 6.8:1
- `#7B8CFF` proofing periwinkle — timers, in-progress
- `#E4B363` baked — published/warm confirmation

**Type.** Display: **Petrona** (soft, low-contrast serif — heads only). Body: **Figtree**. Data: **Martian Mono** for timers.

**Layout.** Vertical rack rows, 52px, each with a left 28px timer ring. Tight vertical rhythm, no card shadows — rows sit on rails.

**Signature — the proof ring.** A circular progress ring per draft showing time-since-created against a healthy window, with the state written inside/next to it: **Resting · Ready · Over-proofed**. Over-proofed rows rise to the top with a periwinkle rail. Functional: it converts an invisible metadata field (created date) into a decision — publish it or bin it.

**Avoided.** Petrona is used on a cool blue-black at low contrast with a periwinkle/gold pair — the serif is doing warmth, not the cream-broadsheet job, and there's no single acid accent.

---

## 10. The Roadside Motel Vacancy Sign — DARK · *the risk*

**Thesis.** The riskiest direction, and the argument for it: "published / not published" is the one thing owners get wrong, and a motel sign says it in enormous unmissable words from across a parking lot. Nobody misreads VACANCY. It's unexpected for a CMS and it is the most literal status system in the set.

**Color**
- `#0D1220` dusk — canvas, deep blue-night
- `#151C2E` panel — row surface
- `#EFF3F8` sign white — text, 15.0:1
- `#93A0B8` road — meta, 6.1:1
- `#2FD8E6` neon cyan — LIVE state, glow used at ≤20% and never behind text
- `#F26A8D` bulb pink — needs review, with a slow blink at 1.5s (respects `prefers-reduced-motion`)

**Type.** Display: **Alfa Slab One** — the screen title only, one word, nothing else. Body: **Manrope**. Data: **DM Mono**.

**Layout.** Rows are 56px sign panels with a fixed left 96px status plate. The plate carries the whole neon treatment; the rest of the row is flat, plain, and completely undecorated so density and legibility survive.

**Signature — the status plate.** Three literal plates: **LIVE** (cyan outline), **DRAFT** (unlit, grey, visibly "off"), **FIX ME** (pink, gently blinking). Unlit vs lit is a luminance difference, not a hue difference, so it reads at a glance and without color. Functional: it is impossible to be uncertain whether your page is on the internet.

**Why it survives review.** The neon is quarantined to a 96px column. Body text sits on flat panels at 15:1. Every glow is decorative-only and removable without information loss. If it fails testing, the fallback is the same plates with no glow — and the direction still works.

**Avoided.** Cyan on deep *blue* night with a pink counterpart, glow confined to a status column — not the acid-green-on-black single-accent default.

---

## Cross-check

| # | Direction | Bg | Accent family | Display face |
|---|---|---|---|---|
| 1 | Pharmacy Rail | light | rose/red | Bitter |
| 2 | Kitchen Pass | dark | yellow | Archivo Black |
| 3 | Tide Chart | light | teal + plum | Fraunces |
| 4 | Pattern Envelope | light | indigo | Syne |
| 5 | On-Air Console | dark | magenta | Antonio |
| 6 | Seed Tray | light | green + beetroot | Recursive Casual |
| 7 | Bowling Scoresheet | dark | bronze | Bungee |
| 8 | Key Board | light | safety orange | Oswald |
| 9 | Proof Rack | dark | periwinkle | Petrona |
| 10 | Vacancy Sign | dark | cyan | Alfa Slab One |

All 10: status carries shape/word + color; body text ≥4.5:1; one obvious labelled primary action per row; the attention state sorts or pins to the top.
