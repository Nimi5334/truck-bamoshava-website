# Pipeline Playbook — exact runbook for one content unit

> The Operator follows this. Stage owners are accountable; gate stamps are mandatory.

## Stage map
| # | Stage | Agent(s) | Input | Output | Gate stamp |
|---|---|---|---|---|---|
| 1 | Plan | chief-of-staff | CEO intent + calendar + scoreboard | `inbox/WO-<date>-<slug>.md` | — |
| 2 | Research | trend-scout ∥ audience-analyst ∥ competitor-watcher (+deep-researcher for flagships) | work order | `research/<slug>-dossier.md` | — |
| 3 | Brief | content-strategist | dossier | `briefs/<slug>-brief.md` + calendar update | — |
| 4a | Headlines | headline-smith | brief | headline block appended to brief | — |
| 4b | Draft | longform-writer / shortform-writer / script-writer | brief (incl. headlines) | `drafts/<slug>.draft.md` | — |
| 4c | Visuals | visual-director (parallel with 4b) | brief | visual brief section in draft + `drafts/<slug>-visuals.md` | — |
| 5 | RED TEAM | red-team-reader | draft | attack report appended; writer revises → `drafts/<slug>.redteamed.md` | `RT: SURVIVES` |
| 6 | EDIT | editor-in-chief | redteamed draft | `drafts/<slug>.edited.md` | `EIC: APPROVED` |
| 7 | FACTS | fact-checker | edited draft | claims table + clean copy → `drafts/<slug>.checked.md` | `FC: VERIFIED` |
| 8 | COMPLIANCE | compliance-officer | checked draft | compliance note in file | `CO: CLEAR` |
| 9 | SEO (longform only) | seo-optimizer | checked draft | SEO block + final tweaks | — |
| 10 | Ship | Operator + distribution-manager | gated file | `published/<slug>.md` + `published/<slug>-rollout.md` | — |
| 11 | Learn | analytics-officer + performance-coach | everything | worklog, scoreboard, feedback files updated | — |

## Rejection loops
- Red team FAILS → back to writer with the attack report. Max 2 rounds, then editor-in-chief arbitrates (can overrule red team with written reason).
- Editor returns → writer revises against notes (not the editor silently fixing — writers must learn).
- Fact-check kills a claim → writer patches the hole or editor approves the cut.
- Any gate skipped = pipeline violation → performance-coach logs it against the Operator's run.

## Timing (for 24/7 scheduled mode)
- Newsletter unit: stages 1–3 day 1; 4–8 day 2; 9–10 day 3 (ship Thursday).
- Social batch: full run same-day.
- Weekly review (Monday): analytics report → coach evolution pass → talent gap scan → board question if needed.
