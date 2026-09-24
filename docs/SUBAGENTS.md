# Day 3: Subagents, spec-driven development, skill & plugin

## Project subagents (`.claude/agents/`)

| Agent | Model | Tools | Job |
|---|---|---|---|
| `spec-test-writer` | sonnet | Read, Grep, Glob, Write, Edit | Turns a requirement ID from SPEC.md into Vitest tests next to the rule file. Never touches app code. |
| `test-runner` | haiku | Bash, Read, Edit, Grep | Runs unit + hook + **e2e** + build and records the **real** counts in TESTS.md. Never fixes code. |
| `ui-checker` | sonnet | Read, Grep, Glob, Bash | Checks N1–N4 + role access (R17/M1) across all roles and reports a table. |

Why narrow tools: the writer can't run tests and the runner can't edit source, so a "Pass" is never written by the same agent that wrote the code.

**Subagent run in this session:** the built-in **Explore** agent reviewed the seat logic and found 4 inline re-implementations. We fixed them (commit `6e35499`). See [`subagent-runs/2026-09-23-explore-seat-logic.md`](subagent-runs/2026-09-23-explore-seat-logic.md).

> Project agents (`.claude/agents/*.md`) load when a Claude Code session **starts**, so they can be called in a new session: `Use the test-runner subagent to run everything and record the results.`

## Custom skill (`.claude/skills/sdd-feature/SKILL.md`)
`/sdd-feature <ID>` runs the loop for one requirement:
1. **SPEC:** `docs/features/<ID>.md`
2. **TEST CASES:** `spec-test-writer` + an e2e scenario
3. **RUN:** `test-runner` / `ui-checker`
4. **RECORD:** real results only

## Spec → test cases → results, per feature

| Feature doc | Requirements | Unit | e2e / browser | Status |
|---|---|---|---|---|
| [A1-R17-role-logins](features/A1-R17-role-logins.md) | A1, R17 | 10/10 | 9/9 | ✅ |
| [S1-F9a-student-rules](features/S1-F9a-student-rules.md) | S1, F5a, F9, F9a, F10 | 10/10 | 6/6 | ✅ |
| [M-club-manager](features/M-club-manager.md) | M1–M5, O1–O8 | 26/26 | 9/9 | ✅ |
| [FA-faculty-admin](features/FA-faculty-admin.md) | FA1, O3f, C1–C6, U1–U2, AN1 | 13/13 | 8/8 | ✅ |
| [F10-F17-dashboard-units](features/F10-F17-dashboard-units.md) | F13–F17 | ✓ | 2/2 e2e + v1 manual | ✅ |
| [F1-F3-event-discovery](features/F1-F3-event-discovery.md) | F1–F3 | 13/13 | 5/5 | ✅ |
| [F4-F7-registration](features/F4-F7-registration.md) | F4–F7, F11, F12, F14 | 9+15 | 9/9 | ✅ |
| [F8-F9-clubs](features/F8-F9-clubs.md) | F8, F9 | ✓ | 4/4 | ✅ |
| [N1-N4-whole-site](features/N1-N4-whole-site.md) | N1–N4 | n/a | 6/6 | ✅ |

## Plugin
**Figma plugin** (`figma@claude-plugins-official` v2.2.111): installed and **actually used**. Its `figma-design-to-code` skill fired and its MCP server's `get_design_context` pulled the Make file this site is built from (MCP_LOG rows 1–4).

