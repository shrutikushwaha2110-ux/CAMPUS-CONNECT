# Day 2: Hooks

Registered in `.claude/settings.json` (project level, so the whole team gets them). Scripts are in `.claude/hooks/`.

| Hook | Event · matcher | What it does | Why |
|---|---|---|---|
| `protect-files.mjs` | **PreToolUse** · `Edit\|Write\|MultiEdit` | Blocks (exit 2) any edit to `SPEC.md` or `src/data/*.json` and tells Claude why | SPEC.md is the team's own source of truth; seed data is designed so every rule can be demoed |
| `run-lib-tests.mjs` | **PostToolUse** · `Edit\|Write\|MultiEdit` | If the edited file is `src/lib/*.ts`, runs Vitest; on failure sends the failing test back to Claude (exit 2) | Rules live in `lib/`; a rule change must never leave tests red unnoticed |

Both hooks append a line to `.claude/hooks/hook-log.txt` every time they fire. That log is the proof.

## Test cases (proof it fires on the right event)

Run `npm run test:hooks`. It sends each hook the same JSON Claude Code sends and checks the exit code.

| # | Input event | Expected | Actual (2026-09-23) | Result |
|---|---|---|---|---|
| TC1 | Edit `SPEC.md` | blocked, exit 2 | exit 2, "Blocked by protect-files hook" | ✅ |
| TC2 | Write `src/data/events.json` | blocked, exit 2 | exit 2 | ✅ |
| TC3 | Edit `src/pages/Home.tsx` | allowed, exit 0 | exit 0 | ✅ |
| TC4 | Edit `docs/SPEC.md.notes` (look-alike name) | allowed, exit 0 | exit 0 | ✅ |
| TC5 | Edit `src/lib/seats.ts`, tests green | tests run, exit 0 | exit 0, log "48 passed (48)" | ✅ |
| TC6 | Edit `src/pages/Home.tsx` | tests **not** run, exit 0 | exit 0, no log line | ✅ |
| TC7 | Edit `src/lib/seats.ts` with a red test present | exit 2 + failure text | exit 2, "1 failed \| 48 passed (49)" | ✅ |

**Bug found by these tests:** the first manual attempt passed a Windows path through `echo`, which silently turned `\\` into `\`. The JSON became invalid and the hook quietly allowed the edit (it "fails open"). The hook now logs `SKIP unreadable hook input` so this can't go unnoticed, and the tests build their JSON with `JSON.stringify`.

## Live demo in Claude Code (for the screenshot)

Hooks load when a session starts, so open a **new** Claude Code session in this folder:

1. Type: `Add a line "test" at the end of SPEC.md`. Claude's Edit is refused with *"Blocked by protect-files hook … SPEC.md is written by the team."* 📸
2. Type: `Add a comment at the top of src/lib/seats.ts`. After the edit, the hook runs Vitest. 📸
3. Show `.claude/hooks/hook-log.txt`: the BLOCK and PASS lines with timestamps. 📸

If Claude Code asks you to review the new hooks the first time, approve them. They are project hooks from `.claude/settings.json`.

## Subagent observability (agents-observe)

1. Install and start [agents-observe](https://github.com/simple10/agents-observe) following its README (it adds its own hook that streams events to a local dashboard).
2. In Claude Code: `Use the Explore subagent to find every place a seat count is calculated or displayed in src/`
3. Watch the subagent's tool calls appear live in the agents-observe dashboard, and take the screenshot 📸 → save as `docs/screenshots/day2-agents-observe.png`.
