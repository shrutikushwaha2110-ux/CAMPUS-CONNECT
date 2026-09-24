# Test log

Every result here was produced by actually running the check. Nothing is filled in from assumption.

## Summary (latest run: 2026-09-24, v3: database)

| Suite | Command | What it covers | Result |
|---|---|---|---|
| Unit + API (Vitest) | `npm test` | Every rule in `src/lib/` + 15 API tests (real Express app, real SQLite DB in memory) | **131 / 131 ✅** |
| End-to-end (real Chrome) | `npm run test:e2e` | 40 scenarios: sign-up + later login, staff approval, every role, access, 375 px, reduced motion, no WebGL (real server, temporary DB) | **40 / 40 ✅**: full table in [`docs/E2E_RESULTS.md`](docs/E2E_RESULTS.md) |
| Hooks | `npm run test:hooks` | The two Claude Code hooks fire on the right events | **9 / 9 ✅** |
| Build | `npm run build` | `tsc --noEmit` + Vite production build | **✅ passes** |

Screenshots taken during the e2e run are in `docs/screenshots/site/`. Proof images of command output are in `docs/screenshots/deliverables/`.

## Unit tests by file

| File | Covers | Tests |
|---|---|---|
| `seats.test.ts` | rules 2, 3, 7, 15 · F6, F11, O5, O7, O8 | 12 |
| `registrations.test.ts` | rules 1, 3, 4, 6, 21–24 · F5a, M3 | 15 |
| `memberships.test.ts` | rules 10, 10a, 11, 20 · F9, F9a, F17 | 9 |
| `permissions.test.ts` | rules 12, 13, 17, 18, 25, 26 · M1, O3f, O4, C3–C5, U1, U3 | 19 |
| `validation.test.ts` | rules 14, 15, 19, 25, 26 · O2, O5, C1, C2, U1, M5 | 21 |
| `auth.test.ts` | A1, U2, faculty club in session, session re-validation | 11 |
| `clubs.test.ts` | rule 20 · C4 | 4 |
| `eventFilter.test.ts` | rules 8, 9 · F1–F3 | 13 |
| `merge.test.ts` | SPEC §6 merge rule | 4 |

## v3 database + sign-up (2026-09-24)

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| SU1 Sign up + later login | Browser: sign up "Neha Rao" neha@atria.edu.in / campus2026, log out, log in on /login/student | Dashboard both times | "#/dashboard Hi, Neha" after sign-up and after the later login | ✅ Pass |
| SU1 Bad input | Existing email, "abc" password, mismatched confirm | Field errors, no account | Browser: password + confirm errors; server: "An account with this email already exists. Log in instead." | ✅ Pass |
| SU2 Staff approval | Sign up Kabir as Dance Club manager; log in; Music head opens Users; Dance head approves | Pending, refused, only Dance head can approve, then login works | "Request sent … waiting for approval"; login refused; Music head: no Approve button; after approval Kabir lands on "Dance Club" | ✅ Pass |
| SU5 Atria email only | Sign-up with `copy.cat@gmail.com` in the browser; API sign-ups with `@gmail.com`, `@atria.edu`, `@atria.edu.in.evil.com`; faculty creating `out@yahoo.com` | Refused everywhere | Browser: "Use your Atria email ending in @atria.edu.in"; API: 400 for all three + the faculty-created one; DB has 0 non-Atria emails. Vitest: 8 look-alikes rejected, `Neha.Rao@ATRIA.EDU.IN` accepted | ✅ Pass |
| SU4 Secrets | Faculty loads /api/state | No passwords / hashes | No password fields or hashes in the response | ✅ Pass |
| SU4 Storage | Inspect `server/data/campusconnect.db` after a browser sign-up | Hash, not the password | `password_hash = scrypt$16384$e7b1…`; 9 tables | ✅ Pass |
| API (Vitest) | 14 HTTP tests: hashing, httpOnly cookie + hashed token, sign-up→logout→login, duplicate/weak, same error for wrong email/password, pending/decline, 401/403 on staff routes, Dance manager vs Music event, faculty vs faculty, 2-club limit + full event on the server, students see only their own registrations, deactivation ends session | as SPEC | 14/14 | ✅ Pass |

## v2.1 changes (2026-09-24): tested in the real browser

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| M6 Club Manager sections | Log in as **Music Club manager**; read navbar + footer; open `/`, `/clubs`, `/units`, `/events`, a Dance event URL | Only "Manage club" + "Events"; other pages → `/manage`; Events = **student Events UI** with Music events + Music announcements; Dance event blocked | Nav + footer = "Manage club", "Events"; `/`, `/clubs`, `/units` → `#/manage`; Events page: title "Events", search, category chips, date filter, cards Open Mic Evening + Battle of Bands; announcements: "Weekly jam night" only; Dance event "Not available" | ✅ Pass |
| O3f Faculty scope | Dr. Farah Khan (head of Dance): Events page; edit Dance Workshop venue; open Maker Tools and Open Mic edit URLs | Own club + unit events only; Music blocked | No "Units" in navbar; rows = Dance + unit events only; venue → Studio B (student sees it); unit edit form opens; Music edit "Not available" | ✅ Pass |
| C3 Own club only | Edit Dance description; open Music edit URL; open "My club" | Dance saved; Music blocked; My club = Dance | as expected | ✅ Pass |
| U1 Assignment scope | Add user → Club Manager / → Faculty | Managers: only Dance Club; new faculty head: only clubs without a head | Manager options: "Dance Club"; head options: "Photography Club"; Asha (new head) logs in → My club = Photography | ✅ Pass |
| U3 Faculty protected | Dance head opens Users | No Edit/Deactivate on other faculty or other clubs' managers | Dr. Vikram Shah, Prof. Meera Nair, Music manager: no buttons ("Protected: faculty account"); Dance manager + students: Edit / Deactivate | ✅ Pass |
| F17/C4 Delete own club | Prof. Meera Nair (head of Music) deletes Music Club | Gone everywhere; manager **and head** can't log in | Not on /clubs; Shruti's clubs = Dance; Battle of Bands cancelled; both logins refused | ✅ Pass |

## The two items that were "not run" in v1: now done

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| F14 Cancelled event on dashboard | Shruti registers Annual Dance Fest; Dance manager cancels it (confirm dialog) | Student dashboard shows "Cancelled by organiser"; nobody can register | Dashboard row "Annual Dance Fest … Cancelled by organiser"; Ananya sees disabled "Cancelled" | ✅ Pass |
| F17 Deleted club disappears | Shruti is in Dance + Music; admin deletes Music Club | Gone from Clubs + dashboard; its events cancelled | Dialog warned "2 upcoming event(s)"; Music not on /clubs; My clubs = Dance only; Battle of Bands shows cancelled; music.manager login refused | ✅ Pass |
| N4 Reduced motion | Chrome emulates `prefers-reduced-motion: reduce` | Static 3D frame, no loop | `data-motion=reduced`, frames=1, still 1 after 1 s; switched back → frames 24 | ✅ Pass |

## Manual checks (in-app browser, by Claude, 2026-09-23)

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| A1 Club manager login | `/login/club-manager`, dance.manager@atria.edu.in / demo123 | Lands on Dance Club dashboard | `#/manage`, title "Dance Club", stats Members 128 / Upcoming 2 | ✅ |
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
