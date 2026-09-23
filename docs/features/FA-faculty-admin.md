# FA1, O3f, C1–C6, U1–U2, AN1: Faculty / Admin area

**Requirements:** admin dashboard · manage any event · add/edit/delete clubs · view any club · manage users · announcements
**Rules:** 12, 18–20, 25, 26 · **Code:** `pages/faculty/*`, `lib/validation.ts` (`validateClub`, `validateUser`), `lib/clubs.ts` (`eventsToCancelOnDelete`), `state/AppData.tsx` (`deleteClub`, `saveUser`)

## What it does
- **`/faculty`:** stats, links to the 4 areas, a needs-attention list (pending approvals and almost-full events, using the shared `seatStatus`), and the latest announcements.
- **Clubs:** add, edit and delete clubs, and view any club's management page.
  - Deleting a club (after "Are you sure?", which states how many upcoming events will be cancelled) hides the club, cancels its upcoming events, removes its memberships and ends its manager's login.
- **Events:** every event, filtered by host and status. Faculty can create or edit with any club or unit as host, cancel, and review registrations.
- **Users:** add accounts (Club Managers must get a club), edit role or club assignment, and deactivate or activate. Emails are unique, and admins can't deactivate or demote themselves.
- **Announcements:** university-wide or for any club.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1–4 | Vitest `clubs.test.ts` | delete Music / Hackathon / E-Sports / unit id | upcoming only, skip cancelled, never units | 4/4 | ✅ |
| 5–9 | Vitest `validation.test.ts` (clubs) | valid, "dance club" duplicate, edit own name, empty manager, bad category | as spec | 5/5 | ✅ |
| 10–13 | Vitest `validation.test.ts` (users) | valid, duplicate email, manager needs club, password rule | as spec | 4/4 | ✅ |
| 14 | e2e FA1 | open /faculty | stats + 4 areas | shown | ✅ |
| 15 | e2e O3f | edit Music event venue | visible to students | "Open Air Theatre" | ✅ |
| 16 | e2e C2 | add "dance club" | error | "A club with this name already exists" | ✅ |
| 17 | e2e C1 | add Photography Club | on /clubs | shown | ✅ |
| 18 | e2e C3 | edit Dance description | on /clubs | shown | ✅ |
| 19 | e2e U1 | create manager Asha for Photography | she sees only that club | /manage shows "Photography Club" | ✅ |
| 20 | e2e U2 | deactivate Raju | login refused | "This account has been deactivated…" | ✅ |
| 21 | e2e C4/F17 | delete Music Club | see F17 | see `F10-F17-dashboard-units.md` | ✅ |

## Results
2026-09-23 · Vitest 13/13 · e2e 8/8 · screenshots `10-faculty-dashboard.png`, `11-faculty-users.png`, `12-student-dashboard-after-club-deleted.png`.
