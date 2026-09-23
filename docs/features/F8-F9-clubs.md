# F8–F9: Clubs (browse, filter, join, leave)

**Requirements (SPEC §5):** F8 browse and filter by category · F9 join/leave, member count ±1 · F12 toasts
**Rules (SPEC §7):** 10 join once, shown count = memberCount + 1 if joined · 11 leaving lowers it again
**Code:** `useClubs` · `useMemberships` · `src/pages/Clubs.tsx`

## What it does
Lists every (non-deleted) club with its description, category, member count and supervising unit. The chips filter by club category. The Join button toggles to "Joined".

## Inputs
- `clubs.json` merged with `campusconnect.clubChanges`
- `campusconnect.joinedClubs`
- search text, category chip

## What "correct" means
- Category chip shows only clubs of that category, and "All" shows all 6.
- Join: button "Joined", count +1, toast "You joined <club>", still joined after reload, listed on Dashboard.
- Leave: button "Join", count back to the base value, toast "You left <club>".
- The supervising unit shows by name (e.g. "Entrepreneurship"), not by id.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Browser | chip "Technology" | Hackathon Club only | Hackathon Club | ✅ |
| 2 | Browser | Join Dance Club | Joined, 128 → 129, toast | as expected, "You joined Dance Club" | ✅ |
| 3 | Browser | reload → Dashboard | Dance Club in My clubs | listed | ✅ |
| 4 | Browser | click Joined | Join, 129 → 128, toast | as expected, "You left Dance Club" | ✅ |

## Results
2026-09-23 · browser 4/4 pass. No pure-logic file yet; the count rule is inline in `Clubs.tsx`.

## v2
- Done: the count rule moved to `lib/memberships.ts` (`memberCount`) with Vitest tests, and the **2-club limit** was added. See `S1-F9a-student-rules.md`.
- Leaving now asks "Are you sure?".
