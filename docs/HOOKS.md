# Day 2: Hooks and agent observability

## The hooks
Registered in `.claude/settings.json` (project level, so every teammate gets them). Scripts are in `.claude/hooks/`.

| Hook | Event · matcher | What it does | Why |
|---|---|---|---|
| `protect-files.mjs` | **PreToolUse** · `Edit\|Write\|MultiEdit` | Blocks (exit 2) edits to `SPEC.md` and `src/data/*.json` unless the path is listed in `approved-edits.txt` | SPEC.md is the team's source of truth; seed data is designed so every rule can be demoed |
| `run-lib-tests.mjs` | **PostToolUse** · `Edit\|Write\|MultiEdit` | After any `src/lib/*.ts` edit, runs Vitest; on failure feeds the failing tests back to Claude (exit 2) | Rules live in `lib/`; a rule change must never leave tests red unnoticed |

Every firing is appended to `.claude/hooks/hook-log.txt`, tagged **`[live]`** when Claude Code fired it (its input has a `session_id`) and **`[test]`** when the test script did.

**Unlocking a protected file** is a team decision: add the path to `.claude/hooks/approved-edits.txt`, make the change, remove the line. The file's history section records who approved what.

## Test cases: `npm run test:hooks` (9/9 ✅)

| # | Event fed to the hook | Expected | Result |
|---|---|---|---|
| TC1 | Edit `SPEC.md` | blocked (exit 2) | ✅ |
| TC2 | Write `src/data/clubs.json` | blocked | ✅ |
| TC8 | Edit a data file that is listed in `approved-edits.txt` | allowed | ✅ |
| TC9 | Same file after it's removed from the list | blocked again | ✅ |
| TC3 | Edit `src/pages/Home.tsx` | allowed | ✅ |
| TC4 | Edit `docs/SPEC.md.notes` (look-alike) | allowed | ✅ |
| TC5 | Edit `src/lib/seats.ts`, tests green | tests run, exit 0 | ✅ |
| TC6 | Edit a page | tests not run | ✅ |
| TC7 | Edit `src/lib/seats.ts` with a red test present | exit 2 + failure text | ✅ |

Proof image: `docs/screenshots/deliverables/day2-hook-tests.png`.

## The hooks firing LIVE in Claude Code (2026-09-23)

These happened in the real session that built v2, not in a test:

| Time (UTC) | What Claude tried | Hook result |
|---|---|---|
| 13:57 | Write new `src/data/users.json` and `announcements.json` for the role logins | **BLOCKED** (both) by protect-files. Claude stopped and **asked the team**; Shruti chose the approved-list option |
| 14:00 | Rewrote `lib/permissions.ts` so Faculty manage everything | **run-lib-tests FAIL** "8 failed \| 40 passed". The hook fed the failures back, and the tests were rewritten for SPEC v2 |
| 14:00 | Rewrote the tests | run-lib-tests PASS "56 passed" |
| 14:30 | Write SPEC.md (while it was on the approved list) | ALLOW (team-approved) |
| 14:31:33 | Edit SPEC.md after re-locking (deliberate live test) | **BLOCKED**, SPEC.md unchanged |
| 14:32 | Write `src/data/clubs.json` | **BLOCKED** `[live]` |

Proof image: `docs/screenshots/deliverables/day2-hook-live-log.png` (the `[live]` lines of `hook-log.txt`).
**Screenshot of the chat itself:** scroll this Claude Code conversation to the message "PreToolUse:Edit hook error … Blocked by protect-files hook: …/SPEC.md" and take a screenshot 📸 (Win + Shift + S).

## Subagent observability (agents-observe)

**Done here:** a built-in **Explore** subagent was spawned in this session. It found four places re-implementing seat maths, which we then fixed. Its report is in [`docs/subagent-runs/2026-09-23-explore-seat-logic.md`](subagent-runs/2026-09-23-explore-seat-logic.md).

**Needs your machine (5 minutes):** agents-observe is not in this account's plugin catalog and needs Docker + the `claude` CLI in a terminal.
1. Start **Docker Desktop** (it's installed).
2. In a terminal in this folder:
   ```
   claude plugin marketplace add simple10/agents-observe
   claude plugin install agents-observe
   claude
   ```
3. Inside that `claude` session type `/observe status`, then open **http://localhost:4981**.
4. Paste: `Use the Explore subagent to find every place an event's seat count is calculated or displayed in src/. Report only.`
5. When the Explore agent's tool calls stream into the dashboard, take the screenshot 📸 → save as `docs/screenshots/deliverables/day2-agents-observe.png`.
