# CampusConnect: Week 2 deliverables

Team: **Shruti** (Figma design) · **Raju** (student pages & logic) · **Sohail** (staff pages) · all three on testing
Design: Figma Make "Add Logo and Name" · Status as of **2026-09-23**

Legend: ✅ done and verified · 🟡 partly done · 📸 team must take a screenshot · 👤 needs your account or action

## Before you start

| Required | Where | Status |
|---|---|---|
| SPEC: pages, what each contains, visitors, what the site must do | [`SPEC.md`](../SPEC.md) | ✅ |
| CLAUDE.md: stack, page structure, naming, never-touch list | [`CLAUDE.md`](../CLAUDE.md) | ✅ (review as a team, then sign off below) |
| Both reviewed by teammates | sign-off table at the bottom | 👤 |

## Standing rules (every day)

| Rule | How we meet it |
|---|---|
| Every feature has a real test case (input, expected, actual) | [`TESTS.md`](../TESTS.md): 48 Vitest + 35 in-browser checks, real results; failures recorded |
| Everyone can explain every part | Per-feature docs in [`docs/features/`](features/) explain what / inputs / correct / why |
| Nothing counts unless it runs | `npm test` 48/48, `npm run build` passes, hooks 7/7, site runs locally |

## Day 1: MCP

| Required | Where | Status |
|---|---|---|
| Figma MCP connected, 3+ pages designed | Figma Make file; 8 routes designed (Home, Events, Event Details, Clubs, Units, Dashboard, Login, 404) | ✅ |
| Site generated from Figma via Claude Code | `src/`, pulled with Figma MCP `get_design_context` | ✅ |
| GitHub MCP: init repo, commit, PR, merge, push | see "Your next steps" | 👤 GitHub MCP not connected in this session |
| Live multi-page site | deploy `dist/` (see below) | 👤 |
| MCP log | [`MCP_LOG.md`](../MCP_LOG.md) | ✅ Figma + browser logged; GitHub rows to fill |
| Custom skill(s) | [`.claude/skills/sdd-feature/SKILL.md`](../.claude/skills/sdd-feature/SKILL.md) | ✅ |
| CLAUDE.md | [`CLAUDE.md`](../CLAUDE.md) | ✅ |

## Day 2: Hook + agent observability

| Required | Where | Status |
|---|---|---|
| Custom hooks | `.claude/settings.json`, `.claude/hooks/protect-files.mjs`, `run-lib-tests.mjs` | ✅ |
| Test case proving it fires on the right event | `npm run test:hooks` → 7/7, [`docs/HOOKS.md`](HOOKS.md), `.claude/hooks/hook-log.txt` | ✅ |
| Live hook firing in Claude Code | new session → try editing SPEC.md | 📸 |
| Built-in subagent observed with agents-observe | steps in [`docs/HOOKS.md`](HOOKS.md#subagent-observability-agents-observe) | 📸 👤 |

## Day 3: Subagents + SDD + plugin

| Required | Where | Status |
|---|---|---|
| Project subagents | `.claude/agents/spec-test-writer.md`, `test-runner.md`, `ui-checker.md` | ✅ |
| Spec + test cases + results **per feature** | [`docs/features/`](features/) (7 docs), summary in [`docs/SUBAGENTS.md`](SUBAGENTS.md) | ✅ student side · 🟡 staff UI |
| Plugin installed and actually used | Figma plugin → `figma-design-to-code` + `get_design_context` | ✅ used · 📸 proof |

## Your next steps (in order)

1. **Review and sign off** SPEC.md and CLAUDE.md as a team (table below).
2. **Connect the GitHub MCP**, then ask Claude Code:
   *"Using the GitHub MCP: create a repo `campusconnect`, push this folder to `main`, create branch `feature/f3-filters`, open a PR 'F3: working date and host filters', merge it."* Log each tool in MCP_LOG.md rows 6–10.
3. **Deploy:** import the repo on Vercel (framework: Vite, build `npm run build`, output `dist`). No rewrites are needed because of the hash router. Put the live link in README.md.
4. **Day 2 screenshots:** open a new Claude Code session → try editing SPEC.md 📸 → run agents-observe + Explore subagent 📸.
5. **Day 3 screenshots:** `/sdd-feature F8` showing both subagents 📸, `/plugin` showing Figma 📸. Save all in `docs/screenshots/`.
6. **Re-run TESTS.md by hand** so each row has your initials, and check reduced-motion (N4) with the OS setting.
7. **Sohail:** build `/manage` and `/faculty` pages using `lib/permissions.ts` + `lib/validation.ts`, then run `/sdd-feature O1` etc.

## Sign-off

| Doc | Shruti | Raju | Sohail |
|---|---|---|---|
| SPEC.md | ☐ | ☐ | ☐ |
| CLAUDE.md | ☐ | ☐ | ☐ |
