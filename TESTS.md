# Test log

Two kinds of tests:

1. **Automated:** `npm test` runs Vitest over the rules in `src/lib/`. The latest run was **48 / 48 passed** (4 files: seats, eventFilter, permissions, validation).
2. **Manual / in-browser:** each row below was actually run against `npm run dev` on the date shown. "Actual" is what really happened.

> Run on 2026-09-23 by Claude Code in the in-app browser pane (scripted clicks and DOM reads on the real running site, starting from cleared localStorage). **Before the viva, each owner should re-run their rows by hand** and put their initials in the "By" column.

## Automated (Vitest)

| File | Covers | Tests | Result |
|---|---|---|---|
| `src/lib/seats.test.ts` | Rule 2, 3, 7 · F6, F11, F14 | 9 | ✅ all pass |
| `src/lib/eventFilter.test.ts` | Rule 8, 9 · F1, F2, F3 | 13 | ✅ all pass |
| `src/lib/permissions.test.ts` | Rule 12, 13, 17, 18 · O3, O4, C5 | 13 | ✅ all pass |
| `src/lib/validation.test.ts` | Rule 14, 15, 19 · O2, O5, C1, C2 | 13 | ✅ all pass |

## Manual (in the browser)

| Feature | Input tried | Expected | Actual | Pass/Fail | By |
|---|---|---|---|---|---|
| F1 List order | Opened `/events` | Upcoming only, soonest first; no Spring Hackathon (past) | 13 events, starting with Annual Dance Fest (14 Nov), then Literature Circle (18 Nov) … Career Fair (15 Dec) last; past event absent | ✅ Pass | Claude |
| F2 Search | Typed "Dance", pressed Search | Only dance-related events | Annual Dance Fest, Contemporary Dance Workshop | ✅ Pass | Claude |
| F2 Search | Typed "zzzz" | Empty state, not a blank page | "No events match your search" + Clear filters button | ✅ Pass | Claude |
| F3 Host filter | Chose Music Club in host filter | Only Music Club events | Open Mic Evening, Battle of Bands | ✅ Pass | Claude |
| F3 Category | Clicked "Workshop" chip | Only workshops | Intro to Maker Tools, Contemporary Dance Workshop | ✅ Pass | Claude |
| F4 Details | Opened Annual Dance Fest | Full details incl. host | Shows date, time, venue, description, "Hosted by Dance Club" | ✅ Pass | Claude |
| F5 Register | Clicked Register on Annual Dance Fest | Button → "Registered", seat count −1 | Button "Registered"; "40 of 120" → "39 of 120 seats left" | ✅ Pass | Claude |
| F5 Refresh | Registered, then reloaded page | Still "Registered" | After reload: still "Registered"; localStorage `["annual-dance-fest"]` | ✅ Pass | Claude |
| F6 Capacity | Opened 24-Hour Hackathon (80/80) | Blocked, "Event Full" | Button "Event Full", disabled | ✅ Pass | Claude |
| F6 Last seat | Registered on Contemporary Dance Workshop (29/30) | Succeeds, then card shows "Full" | Registered; Events card badge changed to "Full" | ✅ Pass | Claude |
| F7 Cancel | Clicked Cancel registration → Yes, cancel | Asks "Are you sure?", then Register back, seat +1 | Confirmation shown; button back to "Register"; "40 of 120 seats left" | ✅ Pass | Claude |
| F8 Club filter | Clicked "Technology" on `/clubs` | Only tech clubs | Hackathon Club only | ✅ Pass | Claude |
| F9 Join club | Clicked Join on Dance Club | "Joined", 128 → 129 | "Joined", 129 members | ✅ Pass | Claude |
| F9 Refresh | Joined, reloaded, opened Dashboard | Club listed on dashboard | Dance Club listed under "My clubs" | ✅ Pass | Claude |
| F9 Leave club | Clicked Joined on Dance Club | "Join", back to 128 | "Join", 128 members | ✅ Pass | Claude |
| F10 Dashboard | Registered for Open Mic Evening, opened Dashboard | Event listed with seat status | Listed with "11 seats left" | ✅ Pass | Claude |
| F11 Badges | Viewed Events cards | "N seats left" / "Almost full" / "Full" | Battle of Bands "200 seats left", Open Mic "12 seats left", Dance Workshop "Almost full" (1 left), Hackathon "Full" | ✅ Pass | Claude |
| F12 Toasts | Register / cancel / join / leave / unfollow | Short confirmation each time | "You're registered for Annual Dance Fest", "Registration cancelled", "You joined Dance Club", "You left Dance Club", "Unfollowed Beyonder Studios" | ✅ Pass | Claude |
| F13 Not found | Opened `/events/999` | Friendly message | "Event not found" + Back to events | ✅ Pass | Claude |
| F13 Unknown route | Opened `/xyz` | Friendly 404 | "We couldn't find that page" + Back to events | ✅ Pass | Claude |
| F13 Empty dashboard | Opened Dashboard with nothing registered | Empty-state message | "You haven't registered for any events yet." | ✅ Pass | Claude |
| F14 Cancelled | Opened E-Sports Night (seed status cancelled) | "Cancelled" shown, register blocked | Banner "This event was cancelled.", button "Cancelled" disabled | ✅ Pass | Claude |
| F14 Dashboard | Staff cancels an event the student registered for | Dashboard shows "Cancelled" | **Not run:** needs the Manage Events page (O6), not built yet | ⬜ Not run | |
| Rule 4 Past | Opened Spring Hackathon (past) | Register blocked | First run: button said "Event Full" (full takes priority). **Fixed** label order → now "Event Passed", disabled | ✅ Pass (after fix) | Claude |
| F15 Units | Opened `/units` | Faculty name on each unit | e.g. Beyonder Studios → "Prof. Meera Nair" | ✅ Pass | Claude |
| F16 Follow | Clicked Follow on Beyonder Studios, reloaded | "Following", dashboard lists unit | "Following"; Dashboard "Following" lists Beyonder Studios | ✅ Pass | Claude |
| F16 Unfollow | Clicked Following | Back to "Follow" | "Follow" | ✅ Pass | Claude |
| F17 Deleted club | Faculty deletes a club | Gone from Clubs + dashboard | **Not run:** needs Manage Clubs page (C4). Filtering logic exists in `useClubs` | ⬜ Not run | |
| A1 Role | Chose Club Manager → Dance Club, then reloaded | Still Dance Club manager, visible | Session `{"role":"clubManager","clubId":"dance-club"}` kept after reload; navbar shows "Dance Club" | ✅ Pass | Claude |
| A1 Switch | Clicked "Switch role" | Back to `/login`, session cleared | `#/login`, session `null` | ✅ Pass | Claude |
| O1–O8, C1–C5 | UI | | **Not run:** staff pages not built yet. Rules unit-tested in Vitest (see above) | ⬜ Not run | |
| N1 Phone | Every route at 375×812 | No sideways scroll | `scrollWidth` = 375 on all 9 routes (/, events, details, clubs, units, dashboard, 999, unknown, login) | ✅ Pass | Claude |
| N2 Footer | Every route | Unofficial-project notice | Present on all 9 routes (login has its own notice) | ✅ Pass | Claude |
| N3 3D UX | Home on desktop and 375 px | Scene enhances; search/cards usable | Floating shapes behind hero; search, chips, featured card all usable; lighter scene on phone | ✅ Pass | Claude |
| N4 No WebGL | Forced `getContext('webgl')` → null, opened Home | Page still works | 0 canvases, hero text + search + featured event render, no uncaught errors | ✅ Pass | Claude |
| N4 Reduced motion | OS "reduce motion" on | Shapes stop moving | Code path present (`prefers-reduced-motion` check in HeroScene). **Still to check by hand** with the OS setting | ⬜ To verify | |

## Bugs found while testing

| Date | Found in | Bug | Fix |
|---|---|---|---|
| 2026-09-23 | Figma export review | Events list not sorted (JSON order) | `upcomingSorted()` in `lib/eventFilter.ts`, used by `useEvents` |
| 2026-09-23 | Figma export review | Date and host filters were dropdowns with no effect | Wired to `filterEvents()`; values stored in the URL |
| 2026-09-23 | Figma export review | Search matched host **id** (`dance-club`), not host name | `matchesQuery()` compares against the resolved host name |
| 2026-09-23 | Rule 4 manual test | Past event that was also full said "Event Full" | Check `isPastEvent` before `isFull` for the label |
