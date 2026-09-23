# Day 3: Subagents, custom skill & plugin

## Project subagents (`.claude/agents/`)

| Agent | Model | Tools | Job | Use it like |
|---|---|---|---|---|
| `spec-test-writer` | sonnet | Read, Grep, Glob, Write, Edit | Turns a requirement ID from SPEC.md into Vitest tests next to the rule file. Never touches app code | "Use spec-test-writer to write tests for F3" |
| `test-runner` | haiku | Bash, Read, Edit, Grep | Runs `npm test` + `npm run build` and records the **real** counts in TESTS.md and the feature doc. Never fixes code | "Use test-runner to run everything and record results for F3" |
| `ui-checker` | sonnet | Read, Grep, Glob, Bash | Checks N1–N4 on every route (375 px, footer, WebGL fallback, alt text/labels) and reports a table | "Use ui-checker to check all pages" |

Why three agents with narrow tools: the writer can't run tests, and the runner can't edit source. That split means a "Pass" is never written by the same agent that wrote the code.

## Custom skill (`.claude/skills/sdd-feature/SKILL.md`)

`/sdd-feature F3` runs the whole spec-driven loop for one requirement:

1. **SPEC:** writes `docs/features/<ID>-<name>.md` from SPEC.md (what it does, inputs, what "correct" means)
2. **TEST CASES:** delegates to `spec-test-writer`, and adds browser cases to the doc
3. **RUN:** delegates to `test-runner` (and `ui-checker` for page-wide checks)
4. **RECORD:** fills Actual/Pass-Fail only from real runs and copies the rows into TESTS.md

## Spec → tests → results per feature

| Feature doc | Requirements | Automated | Manual | Status |
|---|---|---|---|---|
| [F1-F3-event-discovery](features/F1-F3-event-discovery.md) | F1, F2, F3 | 13/13 | 5/5 | ✅ |
| [F4-F7-registration](features/F4-F7-registration.md) | F4–F7, F11, F12, F14 | 9/9 | 9/9 (1 bug fixed) | ✅ |
| [F8-F9-clubs](features/F8-F9-clubs.md) | F8, F9 | n/a | 4/4 | ✅ |
| [F10-F17-dashboard-units](features/F10-F17-dashboard-units.md) | F10, F13, F15–F17 | n/a | 6/6, 1 not run | 🟡 |
| [A1-role-selection](features/A1-role-selection.md) | A1 | n/a | 3/3 | ✅ |
| [O-C-staff-rules](features/O-C-staff-rules.md) | O2–O5, C1, C2, C5 | 26/26 | pages not built | 🟡 |
| [N1-N4-whole-site](features/N1-N4-whole-site.md) | N1–N4 | n/a | 5/6 | 🟡 |

## Plugin

**Installed:** `figma@claude-plugins-official` (v2.2.111).
**Actually used:** its `figma-design-to-code` skill fired, and its MCP server's `get_design_context` pulled the Make file that became this site (see MCP_LOG.md rows 1–4).
**Screenshot to take:** 📸 `/plugin` list showing Figma installed, plus the transcript line "Launching skill: figma:figma-design-to-code" → `docs/screenshots/day3-plugin.png`.

## Demo script for the subagent screenshot

In a new Claude Code session:
```
/sdd-feature F8
```
Claude should launch `spec-test-writer` (tests for club category filter) and then `test-runner`. 📸 Screenshot the transcript showing both subagents → `docs/screenshots/day3-subagents.png`.
