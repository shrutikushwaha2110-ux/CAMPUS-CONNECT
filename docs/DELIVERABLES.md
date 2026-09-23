# CampusConnect: Week 2 deliverables

Team: **Shruti** (Figma) · **Raju** (student pages) · **Sohail** (staff pages) · all three on testing · Status as of **2026-09-23**

Legend: ✅ done and verified here · 📸 screenshot you take on your computer · 👤 needs your account

## Before you start
| Required | Where | Status |
|---|---|---|
| SPEC | [`SPEC.md`](../SPEC.md): v2, three roles, 40+ requirement IDs, 26 rules | ✅ (team sign-off below) |
| CLAUDE.md | [`CLAUDE.md`](../CLAUDE.md): stack, architecture, role/access rules, never-touch list, commands | ✅ |

## Standing rules
| Rule | Evidence |
|---|---|
| Every feature has a real test case | 108 unit + 34 e2e + 9 hook tests, all with real results ([TESTS.md](../TESTS.md), [E2E_RESULTS.md](E2E_RESULTS.md)) |
| Everyone can explain it | [`docs/features/`](features/): what / inputs / correct / results per feature |
| Nothing counts unless it runs | Every number above comes from a real run; failures are recorded in TESTS.md → "Bugs found" |

## Day 1: MCP
| Required | Where | Status |
|---|---|---|
| Figma MCP, 3+ pages designed | Figma Make "Add Logo and Name"; pulled via `get_design_context` | ✅ |
| Site generated from Figma | `src/` + role pages built on the same tokens | ✅ |
| Multi-page site | 25 routes, 3 roles | ✅ runs locally; 👤 live link after deploy |
| GitHub: init, commit, PR, merge, push | `git init` + 2 commits + feature branch ✅ · push / PR / merge 👤 needs your repo URL (see below) | 🟡 |
| MCP log | [`MCP_LOG.md`](../MCP_LOG.md) | ✅ |
| Custom skill | [`.claude/skills/sdd-feature/SKILL.md`](../.claude/skills/sdd-feature/SKILL.md) | ✅ |

## Day 2: Hook + observability
| Required | Where | Status |
|---|---|---|
| Custom hooks | `protect-files` (PreToolUse) + `run-lib-tests` (PostToolUse) | ✅ |
| Test case proving it fires on the right event | `npm run test:hooks` 9/9 + **live firings in this session** ([HOOKS.md](HOOKS.md)) | ✅ proof image `screenshots/deliverables/day2-hook-tests.png`, `day2-hook-live-log.png` |
| Spawn a built-in subagent | **Explore** subagent run here; found 4 issues, fixed ([report](subagent-runs/2026-09-23-explore-seat-logic.md)) | ✅ |
| Observe it with agents-observe + screenshot | steps in [HOOKS.md](HOOKS.md#subagent-observability-agents-observe) | 📸 👤 needs Docker + `claude` CLI on your machine |

## Day 3: Subagents + SDD + plugin
| Required | Where | Status |
|---|---|---|
| Project subagents | `.claude/agents/`: spec-test-writer, test-runner, ui-checker | ✅ |
| Spec + test cases + results per feature | [`docs/features/`](features/): 9 docs, every row run | ✅ |
| Plugin installed and used | Figma plugin: skill + `get_design_context` ([SUBAGENTS.md](SUBAGENTS.md#plugin)) | ✅ · 📸 transcript screenshot |

## Screenshots

**Already made here (real, auto-generated):**
- `docs/screenshots/site/01–13`: every role's pages, taken by the e2e run in real Chrome: login chooser, student clubs at the 2-club limit, student dashboard, pending registrations, manager dashboard, manager blocked from another club, form errors, **cancelled event on the dashboard**, faculty dashboard, users, **dashboard after a club was deleted**, mobile.
- `docs/screenshots/deliverables/`: `day2-hook-tests.png`, `day2-hook-live-log.png`, `unit-tests.png`, `day3-e2e-results.png`, `git-log.png` (rendered from real command output, timestamped).

**Only you can take these (they show your own screen or accounts) 📸** (use Win + Shift + S):
1. **Hook blocking in the chat:** in this Claude Code conversation, the message *"PreToolUse:Edit hook error … Blocked by protect-files hook: …/SPEC.md"* → `day2-hook-chat.png`
2. **agents-observe dashboard** showing the Explore subagent's events (steps in HOOKS.md) → `day2-agents-observe.png`
3. **Plugin proof:** the line *"Launching skill: figma:figma-design-to-code"* and the `get_design_context` result in this conversation → `day3-plugin.png`
4. **Subagent (Day 3):** open a *new* Claude Code session in this folder and type `/sdd-feature F8`. Capture the transcript showing `spec-test-writer` and `test-runner` running → `day3-subagents.png`
5. **GitHub:** the merged PR page on github.com → `day1-merged-pr.png`
6. **Live site** in your browser with its URL visible → `day1-live-site.png`

Save them in `docs/screenshots/deliverables/`.

## GitHub: what happens when you share the repo URL
1. Create an **empty** repo on github.com (no README), and paste its URL in chat.
2. I run `git remote add origin <url>` and push `main` and `feature/v2-docs-and-seat-rules`. Git opens a browser window to sign in to GitHub the first time.
3. I open the PR "v2 docs + centralise seat rules" (in the browser pane, or you click **Compare & pull request**), you review it, then merge it.
4. Deploy: import the repo on vercel.com (framework **Vite**, build `npm run build`, output `dist`). No rewrites needed (hash router). Put the link in README.md.

## Sign-off
| Doc | Shruti | Raju | Sohail |
|---|---|---|---|
| SPEC.md v2 | ☐ | ☐ | ☐ |
| CLAUDE.md | ☐ | ☐ | ☐ |
