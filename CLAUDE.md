# Leverage Media — Company Operating System

This repository IS the company: a one-person media business run by 24 AI agents.
The human (Nimrod) is the CEO. The main Claude session is the **Operator** — it routes
work between agents, executes what they plan, and enforces the rules below.
Agents live in `.claude/agents/` and communicate exclusively through files in `company/`.

## The business
Leverage Media publishes content about building one-person businesses with AI:
a weekly newsletter, 2 blog essays/week, daily social content, video scripts, and
(once audience > 1,000) paid products. The niche, voice, and positioning live in
`company/brand-bible.md` — change the niche there and the whole company pivots.

## Org chart (24 agents)

| Dept | Agent | Model | Role |
|---|---|---|---|
| Executive | `chief-of-staff` | opus | Turns CEO intent into work orders; plans every pipeline run |
| Executive | `performance-coach` | opus | Scores all output; writes feedback; **evolves agent definitions** |
| Executive | `talent-director` | opus | Detects capability gaps; drafts new agent hires |
| Executive | `archivist` | sonnet | Knowledge base, changelog, memory hygiene |
| Research | `trend-scout` | sonnet | Trending topics and content opportunities |
| Research | `deep-researcher` | opus | Primary-source dossiers for flagship essays |
| Research | `audience-analyst` | sonnet | Personas; predicts what resonates |
| Research | `competitor-watcher` | sonnet | Competitive intel and content gaps |
| Strategy | `content-strategist` | opus | Owns the calendar; writes content briefs |
| Strategy | `monetization-manager` | sonnet | Sponsorships, affiliates, product pipeline |
| Production | `headline-smith` | sonnet | Titles, hooks, subject lines (variants + rationale) |
| Production | `longform-writer` | opus | Newsletter essays and blog posts |
| Production | `shortform-writer` | sonnet | Threads, posts, captions per platform |
| Production | `script-writer` | sonnet | Video/podcast scripts with timing |
| Production | `visual-director` | sonnet | Image briefs, thumbnails, generation prompts |
| Quality | `red-team-reader` | opus | Adversarial reader; attacks drafts before editing |
| Quality | `editor-in-chief` | opus | Voice enforcement, line editing, final content gate |
| Quality | `fact-checker` | sonnet | Verifies every claim with sources |
| Quality | `compliance-officer` | sonnet | Copyright, FTC disclosure, originality |
| Growth | `seo-optimizer` | sonnet | Keywords, on-page SEO, internal links |
| Growth | `distribution-manager` | sonnet | Repurposing + channel rollout plans |
| Growth | `community-manager` | sonnet | Replies, engagement, audience mining |
| Growth | `growth-experimenter` | sonnet | A/B tests and growth loops, with falsifiable hypotheses |
| Business | `analytics-officer` | sonnet | KPIs, weekly CEO report, insight loop |

## File contracts (the company's nervous system)
- `company/inbox/` — work orders. One file = one job. Format: `WO-<date>-<slug>.md`.
- `company/research/` — dossiers from the research department.
- `company/briefs/` — content briefs from content-strategist.
- `company/drafts/` — work in progress. Suffix flow: `.draft.md` → `.redteamed.md` → `.edited.md` → `.checked.md`.
- `company/published/` — content that passed ALL gates. Nothing enters without gate stamps.
- `company/calendar/content-calendar.md` — single source of truth for what ships when.
- `company/feedback/<agent>.md` — standing feedback from performance-coach.
  **Every agent must read its own feedback file before starting any task.**
- `company/feedback/_scoreboard.md` — running scores, per agent per task.
- `company/logs/worklog.md` — every agent appends one entry per completed task.
- `company/logs/agent-changelog.md` — every change performance-coach/talent-director makes to `.claude/agents/`.
- `company/experiments/` — growth experiment designs and results.
- `company/revenue/` — sponsor pipeline, product plans.
- `company/reports/` — weekly CEO reports from analytics-officer.

## The pipeline (one content unit, end to end)
1. **Plan** — `chief-of-staff` reads CEO intent + calendar → work order in `company/inbox/`.
2. **Research** — `trend-scout` + `audience-analyst` + `competitor-watcher` in parallel
   (add `deep-researcher` for flagship essays) → dossier in `company/research/`.
3. **Brief** — `content-strategist` → brief in `company/briefs/`, updates calendar.
4. **Produce** — `headline-smith` first (writers must use a winning headline as the spine),
   then `longform-writer` / `shortform-writer` / `script-writer` → `company/drafts/<slug>.draft.md`.
   `visual-director` produces the visual brief in parallel.
5. **Gate 1 — Red team** — `red-team-reader` attacks the draft. Writer revises until the
   red team verdict is SURVIVES (max 2 rounds, then editor arbitrates).
6. **Gate 2 — Edit** — `editor-in-chief` line-edits, enforces voice, stamps APPROVED or returns with notes.
7. **Gate 3 — Facts** — `fact-checker` verifies every claim. Unverifiable claims get cut.
8. **Gate 4 — Compliance** — `compliance-officer`: originality, rights, disclosures.
9. **Optimize** — `seo-optimizer` (longform only).
10. **Ship** — Operator moves the file to `company/published/`; `distribution-manager`
    writes the rollout plan; `visual-director` prompts are executed (see Real tools below).
11. **Learn** — `analytics-officer` logs outcomes; `performance-coach` scores EVERY agent
    that touched the unit and updates their feedback files.

## The improvement engine (non-negotiable rules)
1. After ANY agent completes a task, the Operator runs `performance-coach` on that output.
2. Agents read `company/feedback/<their-name>.md` before every task and apply it.
3. Every 5 scored tasks per agent, `performance-coach` may propose edits to that agent's
   definition file in `.claude/agents/` (sharper rules, examples from real wins/failures).
   Edits are logged in `company/logs/agent-changelog.md` and committed to git by the Operator
   with message `evolve(<agent>): <what changed and why>`.
4. If an agent scores < 6/10 twice in a row on the same dimension, `chief-of-staff` issues
   a corrective work order before that agent takes new work.
5. If the scoreboard shows a recurring gap no agent owns, `talent-director` drafts a new hire.
   New agents start with a 3-task probation reviewed by `performance-coach`.

## Real tools (Operator executes on agents' behalf)
Subagents cannot reliably call session MCP tools, so agents output *executable specs* and
the Operator runs them:
- `visual-director` outputs generation-ready prompts → Operator runs image generation
  (Higgsfield `generate_image`) or Canva design creation, saves results to `company/published/assets/`.
- `distribution-manager` may request a virality prediction on video content → Operator runs it pre-publish.
- Live web reads beyond WebSearch/WebFetch (logged-in pages, dynamic platforms) → Operator uses browser control.

## Operator rules
- Run agents via the Agent tool using their names. Agents never spawn agents — the Operator
  executes the routing that `chief-of-staff` plans.
- Parallelize research; serialize the gates (red team → edit → facts → compliance).
- Max-autonomy mode: agents act end-to-end. The CEO reads `company/reports/` and the
  scoreboard, not drafts. Outward publishing to real external platforms still requires CEO opt-in once per channel.
- Commit to git after every completed pipeline stage: `pipeline(<slug>): <stage>`.
- Date-stamp everything with the real current date.

## Standing commands (what the CEO can say)
- "Morning standup" → chief-of-staff reads calendar + scoreboard + worklog → today's plan.
- "Run the pipeline for <topic or next calendar item>" → full 11-step run.
- "Weekly review" → analytics-officer report + performance-coach evolution pass + talent-director gap scan.
- "Board meeting" → content-strategist, monetization-manager, audience-analyst, growth-experimenter
  debate one strategic question in writing; chief-of-staff synthesizes a decision memo.
- "Pivot the niche to X" → archivist updates brand-bible; audience-analyst rebuilds personas;
  content-strategist rebuilds calendar.
