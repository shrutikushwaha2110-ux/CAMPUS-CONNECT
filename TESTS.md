# Test log

Every result here was produced by actually running the check. Nothing is filled in from assumption.

## Summary (latest run: 2026-09-23)

| Suite | Command | What it covers | Result |
|---|---|---|---|
| Unit (Vitest) | `npm test` | Every rule in `src/lib/` (9 files) | **108 / 108 ✅** |
| End-to-end (real Chrome) | `npm run test:e2e` | 34 scenarios across Student, Club Manager, Faculty/Admin, access, 375 px, reduced motion, no WebGL | **34 / 34 ✅**: full table in [`docs/E2E_RESULTS.md`](docs/E2E_RESULTS.md) |
| Hooks | `npm run test:hooks` | The two Claude Code hooks fire on the right events | **9 / 9 ✅** |
| Build | `npm run build` | `tsc --noEmit` + Vite production build | **✅ passes** |

Screenshots taken during the e2e run are in `docs/screenshots/site/`. Proof images of command output are in `docs/screenshots/deliverables/`.

## Unit tests by file

| File | Covers | Tests |
|---|---|---|
| `seats.test.ts` | rules 2, 3, 7, 15 · F6, F11, O5, O7, O8 | 12 |
| `registrations.test.ts` | rules 1, 3, 4, 6, 21–24 · F5a, M3 | 15 |
| `memberships.test.ts` | rules 10, 10a, 11, 20 · F9, F9a, F17 | 9 |
| `permissions.test.ts` | rules 12, 13, 17, 18, 25 · M1, O3, O4, C5 | 21 |
| `validation.test.ts` | rules 14, 15, 19, 25, 26 · O2, O5, C1, C2, U1, M5 | 20 |
| `auth.test.ts` | A1, U2, session re-validation | 10 |
| `clubs.test.ts` | rule 20 · C4 | 4 |
| `eventFilter.test.ts` | rules 8, 9 · F1–F3 | 13 |
| `merge.test.ts` | SPEC §6 merge rule | 4 |

## The two items that were "not run" in v1: now done

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| F14 Cancelled event on dashboard | Shruti registers Annual Dance Fest; Dance manager cancels it (confirm dialog) | Student dashboard shows "Cancelled by organiser"; nobody can register | Dashboard row "Annual Dance Fest … Cancelled by organiser"; Ananya sees disabled "Cancelled" | ✅ Pass |
| F17 Deleted club disappears | Shruti is in Dance + Music; admin deletes Music Club | Gone from Clubs + dashboard; its events cancelled | Dialog warned "2 upcoming event(s)"; Music not on /clubs; My clubs = Dance only; Battle of Bands shows cancelled; music.manager login refused | ✅ Pass |
| N4 Reduced motion | Chrome emulates `prefers-reduced-motion: reduce` | Static 3D frame, no loop | `data-motion=reduced`, frames=1, still 1 after 1 s; switched back → frames 24 | ✅ Pass |

## Manual checks (in-app browser, by Claude, 2026-09-23)

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| A1 Club manager login | `/login/club-manager`, dance.manager@atria.edu / demo123 | Lands on Dance Club dashboard | `#/manage`, title "Dance Club", stats Members 128 / Upcoming 2 | ✅ |
| M1 Other club URL | as Dance manager open `/manage/events/open-mic-evening/registrations` | Blocked | "Not available for your role … These registrations belong to another club." | ✅ |
| R17 Faculty page | as Dance manager open `/faculty` | Blocked | "Not available … only for Faculty / Admin" | ✅ |
| v1 rows | Search, filters, register/cancel, full/last seat, 404, units, 375 px (35 checks) | as SPEC | All passed on 2026-09-23 (v1 log, still valid: same pages) | ✅ |

> **Team:** before the viva, each owner should re-run a few rows by hand (log in with the demo accounts in SPEC §2) and add your initials here.

## Bugs found by testing

| Date | Found by | Bug | Fix |
|---|---|---|---|
| 2026-09-23 | Figma export review | List unsorted; date/host filters did nothing; search matched host id | `lib/eventFilter.ts` |
| 2026-09-23 | Manual test (rule 4) | Past + full event said "Event Full" | Label order Cancelled → Passed → Full |
| 2026-09-23 | Hook test cases | Invalid hook input silently allowed an edit | Hook now logs `SKIP unreadable hook input` |
| 2026-09-23 | `run-lib-tests` hook (live) | Changing permissions to "Faculty manages all" left 8 old tests red | Tests rewritten for SPEC v2 |
| 2026-09-23 | Hook test cases | A bad edit to the hooks (undefined `src`) made both crash, so nothing was blocked | Caught at 1/9, fixed, back to 9/9 |
| 2026-09-23 | Explore subagent | Seat maths re-implemented in 4 places (hard-coded `5` in FacultyHome) | `seatsFilled`, `seatsTakenNow`, `unnamedEarlierSeats` in lib |
| 2026-09-23 | e2e suite | Test-harness only: Puppeteer mouse clicks lost after reload; toast text matched "Music Club" | DOM clicks; check club cards not body text |
| 2026-09-23 | Hero review | Reduced motion kept the animation loop running (only skipped movement) and never reacted to setting changes | One static frame, loop stopped, live `change` listener |
