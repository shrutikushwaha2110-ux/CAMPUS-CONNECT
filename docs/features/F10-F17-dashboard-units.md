# F13–F17: Cancelled events, deleted clubs, units, empty states

**Requirements:** F13 friendly empty states · F14 cancelled event on the page **and the student dashboard** · F15 units · F16 follow · F17 deleted club disappears
**Code:** `state/AppData.tsx` (`cancelEvent`, `deleteClub`, live-club filtering), `lib/clubs.ts`, `pages/Dashboard.tsx`, `components/ui.tsx` (`RegStatusPill`), `pages/Units.tsx`, `pages/NotFound.tsx`

## What "correct" means
- **F14:** when staff cancel an event, it keeps existing with `status: cancelled`.
  - Its page shows "This event was cancelled." and a disabled "Cancelled" button.
  - Every student registered for it sees **"Cancelled by organiser"** on their dashboard.
- **F17:** when Faculty delete a club:
  - it disappears from `/clubs`, Home and every student's "My clubs"
  - its announcements are hidden and its membership slot is freed
  - its upcoming events show as cancelled
  - its manager can't log in
- **F13:** no search results, an empty dashboard, `/events/999` and unknown routes all show a message.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | e2e F14 | Shruti registers Annual Dance Fest → Dance manager cancels it | dashboard "Cancelled by organiser" | exactly that; another student sees disabled "Cancelled" | ✅ |
| 2 | e2e F17 | Shruti in Dance + Music → admin deletes Music Club | gone everywhere | dialog warned 2 upcoming events; not on /clubs; My clubs = Dance only; Battle of Bands cancelled; music.manager login refused | ✅ |
| 3 | Vitest | memberships of a deleted club don't count toward the 2-club limit | slot freed | pass | ✅ |
| 4 | browser (v1 run) | `/events/999`, `/xyz`, empty dashboard | messages | "Event not found", 404 page, empty-state text | ✅ |
| 5 | browser (v1 run) | follow Beyonder Studios, reload | Following + on dashboard | as expected | ✅ |

## Results
2026-09-23 · both previously "not run" cases (F14 dashboard, F17) are now **built and passing in the real browser**. Screenshots: `09-student-dashboard-cancelled-event.png`, `12-student-dashboard-after-club-deleted.png`.
