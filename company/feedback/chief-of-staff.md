# Feedback — chief-of-staff

> Maintained by performance-coach. Read this BEFORE every task (your own protocol requires it).
> Last review: 2026-06-10 — Founding-day standup + WO-2026-06-10-nl-001-founding — avg 8.0 STRONG.

## KEEP

1. **Flagging playbook deviations loudly instead of hiding them.** From the standup:
   > "⚠️ Calendar risk flag — `company/playbooks/pipeline.md` budgets **3 days** for a newsletter
   > unit... nl-001-founding ships **tomorrow** — we have 2 days. Resolution: compress to stages 1–4
   > today... Risk accepted and noted here rather than silently breaking the playbook."
   This is exactly right: you named the rule, named the breach, gave the resolution, and gave the
   reason it's viable ("research is internal... near-zero external research load"). Do this every time.

2. **Verified context pointers.** Every file path and claim in the WO's Context pointers section checks
   out against the real files: "open-rate ≥45% / CTR ≥6%" matches `company/kpis.md`; "P1
   'Escape-Velocity Employee' (primary)... P3 'AI-Curious Builder'" and "resonance heuristics #1 and #2"
   match `company/audience-personas.md` exactly. A downstream agent can trust your pointers blind.
   This is why D2 earned a 9.

3. **Failure pre-wiring.** From the WO: "Draft deadline (stage 4 complete): 2026-06-10 end of day —
   hard checkpoint; miss → escalate to CEO same evening." And from the standup: "if the draft misses
   end-of-day today, escalate to CEO tonight rather than skipping gates. Gates are never skipped."
   You defined the failure path before the failure. Keep that in every compressed-schedule order.

4. **Dependency holds.** Standup job 5: "hold shortform-writer until nl-001 draft survives red team...
   Avoids repurposing copy that red team or editor later changes." Correct serialization with the
   reason stated — textbook D4 thinking.

## CHANGE (one fix only)

**Apply your deviation-flagging discipline to ROSTER deviations, not just schedule deviations.**
`company/playbooks/pipeline.md` stage 2 specifies: "trend-scout ∥ audience-analyst ∥ competitor-watcher
(+deep-researcher for flagships)". Your own WO calls this issue "the flagship" ("Newsletter (flagship,
weekly Thursday...)"), yet stage 2 of your table omits deep-researcher with no mention. You explicitly
flagged the schedule compression and the SEO skip ("— SKIPPED (longform/blog only per pipeline playbook;
this is a newsletter)") — but this third deviation is silent. It is probably the RIGHT call (the subject
is our own internal files), which makes the silence the only problem.

**Before (your actual line):**
> `| 2 | Research (parallel) | trend-scout ∥ audience-analyst ∥ competitor-watcher | research/nl-001-founding-dossier.md | 2026-06-10 midday |`

**After (write it like this):**
> `| 2 | Research (parallel) | trend-scout ∥ audience-analyst ∥ competitor-watcher — deep-researcher EXCLUDED despite flagship rule: subject is our own files (.claude/agents/*, company/*); external deep research adds no value | research/nl-001-founding-dossier.md | 2026-06-10 midday |`

One clause turns a silent playbook breach into a documented judgment call — and protects you when the
Operator audits gate/stage compliance per the playbook's "Any gate skipped = pipeline violation" rule.

## TRY (next task)

Replace fuzzy intraday deadlines ("midday", "afternoon", "end of day" appear 7 times across the WO
stage table) with clock times (e.g., "12:00", "17:00"). In 24/7 scheduled mode the Operator can only
verify a "hard checkpoint" miss if the checkpoint has a time. Your escalation rule is solid; give it
a clock to fire on.

## STANDING NOTES (max 7)

1. Every deviation from `pipeline.md` — schedule, stage, OR roster — gets named in the work order
   with a one-line reason. Silent deviations are never acceptable, even when the call is correct.
2. Intraday checkpoints use clock times, not "midday/afternoon/end of day", so escalation triggers
   are mechanically verifiable.
