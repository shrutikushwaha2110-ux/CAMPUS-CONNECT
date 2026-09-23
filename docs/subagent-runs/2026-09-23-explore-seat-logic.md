# Subagent run: built-in `Explore` agent (Day 2)

**Date:** 2026-09-23 · **Launched from:** the Claude Code session that built v2 · **Mode:** background, read-only
**Stats reported by Claude Code:** 6 tool calls, ~49.5k subagent tokens, 34.8 s

## Prompt given to the subagent
> In the project, find every place where an event's seat count (seats left / seats filled / full / almost full) is calculated or displayed. Medium thoroughness. For each place give file:line, whether it CALCULATES or only DISPLAYS, and which function it relies on. Finish with one sentence: is all seat arithmetic centralised in src/lib, or is any page re-implementing it inline? Report only; do not modify files.

## Subagent report (verbatim summary of its findings)
- `lib/seats.ts`: `seatsLeft` = max(0, total − taken − localActive); `seatStatus` returns cancelled / full / almost-full / available using `ALMOST_FULL_THRESHOLD`.
- `lib/registrations.ts`: `localActiveCount`; the full-checks in `registerBlockReason` and `reviewBlockReason`.
- Pages that CALCULATE by calling lib: `Home.tsx`, `EventDetails.tsx`, `EventCard.tsx`. `SeatsBadge.tsx` only DISPLAYS.
- **Inline re-implementations found:**
  1. `pages/faculty/FacultyHome.tsx`: hard-coded `<= 5` and its own Full / "N left" rule instead of `seatStatus` / `ALMOST_FULL_THRESHOLD`.
  2. `components/staff.tsx`: seats filled computed inline (`total − seatsLeft(...)`).
  3. `pages/manage/EventForm.tsx`: "taken now" computed inline (`seatsTaken + localTaken(id)`).
  4. `pages/manage/EventRegistrations.tsx`: earlier unnamed seats computed inline.
- **Verdict:** "The core formula is centralised in lib/seats.ts, but four places still work it out inline."

## What we did with it
Commit `6e35499` "Centralise seat maths in lib/seats (found by Explore subagent)":
- Added `seatsFilled`, `seatsTakenNow` and `unnamedEarlierSeats` to `src/lib/seats.ts`, with 3 new tests (108 in total).
- `FacultyHome` now uses `seatStatus`, so it follows the shared 1–5 "almost full" rule.
- All tests re-run: unit 108/108, e2e 34/34.

## Observing it live (agents-observe)
agents-observe (https://github.com/simple10/agents-observe) runs as a Claude Code plugin with Docker. It isn't in this account's plugin catalog, so it has to be installed from a terminal on this machine (steps in `docs/HOOKS.md`). Then re-run the same prompt and take the dashboard screenshot.
