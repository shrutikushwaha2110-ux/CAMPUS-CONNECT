---
name: sdd-feature
description: Spec-driven development for one CampusConnect requirement. Takes a requirement ID from SPEC.md (e.g. F3, O2, C5) through SPEC → TEST CASES → RUN → RECORD, producing docs/features/<id>.md, Vitest tests, and TESTS.md rows with real results. Use when starting, finishing, or proving a feature.
argument-hint: <requirement-id> e.g. F3
---

# /sdd-feature <ID>

The team's Day 3 workflow: no feature counts as done without a spec, test cases, and recorded results.

## 1. SPEC
- Find `<ID>` in `SPEC.md` §5 and every §7 rule it depends on. If the ID doesn't exist, stop and say so.
- Create or update `docs/features/<ID>-<short-name>.md` using the template below. Fill **What it does**, **Inputs**, and **What "correct" means** from SPEC.md only. If something is ambiguous, list it under **Open questions** and ask the team instead of guessing.

## 2. TEST CASES
- Delegate to the **`spec-test-writer`** subagent: "Write Vitest tests for `<ID>` from SPEC.md and docs/features/<file>."
- Add the manual (in-browser) cases to the feature doc's **Test cases** table: input, expected, and blank Actual/Result.

## 3. RUN
- Delegate to the **`test-runner`** subagent to run `npm test` and `npm run build`.
- For manual cases, run the dev server and try each one in the browser (or delegate page-wide checks to **`ui-checker`**).

## 4. RECORD
- Fill **Actual** and **Pass/Fail** with what really happened, then copy the rows into `TESTS.md`.
- If anything failed: record it, fix it in `src/lib/` (or the page), and re-run. Add the bug to TESTS.md → "Bugs found".
- Log any MCP tool used in `MCP_LOG.md`.

## Template: docs/features/<ID>-<name>.md

```markdown
# <ID>: <requirement title>

**Requirement (SPEC §5):** <copied row>
**Rules (SPEC §7):** <numbers + one line each>
**Code:** <lib file> · <hook> · <page>

## What it does
## Inputs
## What "correct" means
- bullet per observable outcome, including edge cases

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|

## Results
<date>, npm test x/y, manual n/m, notes

## Open questions
```

## Never
- Never write "Pass" or fill "Actual" before running the case.
- Never edit `SPEC.md` (a hook blocks it anyway). Propose the change to the team instead.
