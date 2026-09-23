# F10, F13, F15–F17: Dashboard, units & empty states

**Requirements (SPEC §5):** F10 dashboard lists registrations, clubs, units · F13 friendly empty states · F15 units with faculty · F16 follow/unfollow · F17 deleted clubs disappear
**Code:** `src/pages/Dashboard.tsx` · `src/pages/Units.tsx` · `src/pages/NotFound.tsx` · `useMemberships` · `useClubs`

## What it does
The Dashboard has three sections (registered events with a live seat/cancel badge, joined clubs, followed units), each with its own empty state. Units lists all 7 units with faculty head, supervised clubs, and a Follow toggle.

## What "correct" means
- Each Dashboard section shows its items, or a one-line empty message when it has none.
- A registered event shows its current status badge, including "Cancelled".
- Following survives reload, and the unit then appears on the Dashboard.
- A club marked deleted in `clubChanges` is filtered out by `useClubs`, so it vanishes from Clubs and the Dashboard.
- Unknown routes show the 404 page with "Back to events".

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Browser | empty storage → Dashboard | 3 empty messages | "You haven't registered for any events yet." etc. | ✅ |
| 2 | Browser | register Open Mic → Dashboard | listed with badge | "11 seats left" | ✅ |
| 3 | Browser | `/units` | faculty names | Beyonder Studios → Prof. Meera Nair | ✅ |
| 4 | Browser | Follow Beyonder Studios, reload | Following + on Dashboard | as expected | ✅ |
| 5 | Browser | Unfollow | Follow + toast | "Unfollowed Beyonder Studios" | ✅ |
| 6 | Browser | `/xyz` | 404 page | "We couldn't find that page" | ✅ |
| 7 | Browser | Faculty deletes Dance Club | gone everywhere | **Not run:** needs C4 page | ⬜ |

## Results
2026-09-23 · browser 6/6 run, all pass · 1 not run (blocked on staff pages).
