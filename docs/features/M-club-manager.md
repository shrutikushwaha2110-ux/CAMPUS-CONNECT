# M1–M5, O1–O8: Club Manager area

**Requirements:** M1 own club only · M2 club dashboard · M3 accept/reject registrations · M5 club announcements · O1–O8 events
**Rules:** 1–3, 12–17, 22–25 · **Code:** `lib/permissions.ts` · `lib/registrations.ts` (`initialStatus`, `reviewBlockReason`) · `lib/validation.ts` · `pages/manage/*` · `components/staff.tsx`

## What it does
`/manage` is the Club Manager dashboard for the club in their session (`ClubAdminView`). It shows:
- club info
- stats: members, upcoming events, registrations, pending
- upcoming events with seats filled and Registrations / Edit / Cancel
- the members list
- club announcements

From there the manager can:
- **Create events.** The host is locked to their own club. Ticking "needs approval" makes registrations start as Pending.
- **Accept or Reject registrations** on `/manage/events/:id/registrations`. Reject frees the seat; accepting a rejected registration again needs a free seat.
- **Post or edit announcements** for their club (the audience is locked). Members see them on their dashboard.

**Scope:** `canViewClubAdmin` and `canManageEvent` are checked in the route guard *and* inside each page, so another club's IDs typed in the URL are refused.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1–21 | Vitest `permissions.test.ts` | manager vs own/other club/unit events, club admin view, announcements, hosts | as spec | 21/21 | ✅ |
| 22–26 | Vitest `registrations.test.ts` | pending start, accept, re-accept needs seat, same-status no-op, rejected frees seat | as spec | 5/5 | ✅ |
| 27 | e2e M3 | Shruti requests Battle of Bands | Pending | "Pending approval" | ✅ |
| 28 | e2e M3 | Music manager clicks Accept | Confirmed for student | Confirmed on dashboard | ✅ |
| 29 | e2e M3 | Music manager rejects Raju | seat freed, Raju sees Rejected | 50/60 → 49/60; "Rejected" | ✅ |
| 30 | e2e M1 | Dance manager /manage | only Dance | events annual-dance-fest, dance-workshop; members incl. Shruti | ✅ |
| 31 | e2e M1/O4 | Dance manager on Music URLs + /faculty | blocked | 3/3 blocked | ✅ |
| 32 | e2e O2 | seats 0 + past date | errors, nothing saved | "Date cannot be in the past"; "Seats must be at least 1" | ✅ |
| 33 | e2e O1 | create "Salsa Social Night" | on /events by Dance Club | host "Dance Club (locked)"; listed | ✅ |
| 34 | e2e M5 | post "Costume fitting" | member sees it | audience "Dance Club members (locked)"; on Shruti's dashboard | ✅ |
| 35 | e2e O6/F14 | cancel Annual Dance Fest (confirm) | students see cancelled | "Cancelled by organiser" | ✅ |

## Results
2026-09-23 · Vitest 26/26 · e2e 9/9 · screenshots `05-manager-registrations-pending.png`, `06-manager-dashboard.png`, `07-manager-blocked-other-club.png`, `08-event-form-errors.png`.

## v2.1 (2026-09-24): only two sections
- Navbar **and footer** show only **Manage club** and **Events**. `/`, `/clubs`, `/units` redirect to `/manage` (`HideFor`).
- **Manage club** (`/manage`): club info, stats, upcoming events (Registrations / Edit / Cancel), + New event, + Announcement, members.
- **Events** (`/events` → `StaffEvents`): current hosted events, past & cancelled, and the club's announcements (Edit / Delete).
- Opening another club's event page is blocked.

| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 36 | e2e M6 | **Music manager** logs in (your example) | nav/footer = Manage club + Events; redirects; Events = Music only | exactly that; Dance event URL "Not available" | ✅ |

Screenshots: `14-music-manager-manage-club.png`, `15-music-manager-events.png`.

## v2.2 (2026-09-24): Events section uses the student UI
The manager's **Events** section is now the same `Events` page students use: title, search bar, category chips, date filter and event cards. It shows only the club's hosted events (no host filter, since there's one host), with the club's announcements below. A card opens the event page, which shows "Manage registrations". Editing, cancelling and past events are in **Manage club**.

| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 37 | e2e M6 | Music manager opens Events | student UI, Music events only, Music announcements | title "Events", search + chips + date filter present, cards = Open Mic Evening, Battle of Bands; announcement "Weekly jam night" | ✅ |

Screenshot: `15-music-manager-events.png`.
