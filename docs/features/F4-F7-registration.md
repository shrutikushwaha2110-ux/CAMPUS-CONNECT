# F4–F7, F11, F12, F14: Event details, registration & seats

**Requirements (SPEC §5):** F4 details incl. host · F5 register and persist · F6 blocked when full · F7 cancel with confirmation · F11 seat badges · F12 confirmation toasts · F14 cancelled events
**Rules (SPEC §7):** 1 register once · 2 seats-left formula · 3 full blocks · 4 past blocks · 5 cancel frees seat · 6 cancelled blocks · 7 "Almost full" at 1–5
**Code:** `src/lib/seats.ts` · `useRegistrations` · `src/pages/EventDetails.tsx` · `components/SeatsBadge.tsx`

## What it does
The event page shows poster, category, "Hosted by" (a link to Clubs or Units), description, date, time, venue, and a registration card. The demo student can register once. After that the button reads "Registered", the seat count drops by one, and a toast confirms it. "Cancel registration" asks "Are you sure?" first.

## Inputs
- Event from `events.json` merged with `campusconnect.eventChanges`
- `campusconnect.registrations` (array of event IDs)
- today from `getToday()`

## What "correct" means
- seatsLeft = `seatsTotal − seatsTaken − (registered ? 1 : 0)`, never below 0.
- Badge: `> 5` → "N seats left" · `1–5` → "Almost full" · `0` → "Full" · cancelled → "Cancelled".
- The Register button is disabled with a reason label, checked in this order: **Cancelled → Event Passed → Event Full**.
- Registration survives a reload (localStorage).
- Cancelling needs a second click ("Yes, cancel") and restores the seat.
- An unknown id shows "Event not found", never a blank page.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Vitest | seatsLeft(120, 80, false) | 40 | 40 | ✅ |
| 2 | Vitest | seatsLeft(120, 80, true) | 39 | 39 | ✅ |
| 3 | Vitest | seatsLeft(80, 80, true) | 0 (not −1) | 0 | ✅ |
| 4 | Vitest | status 30/25 | almost-full (exactly 5) | almost-full | ✅ |
| 5 | Vitest | status 30/29 | almost-full (1 left) | almost-full | ✅ |
| 6 | Vitest | status 30/29 + registered | full | full | ✅ |
| 7 | Vitest | status 80/80 | full | full | ✅ |
| 8 | Vitest | status cancelled 60/20 | cancelled | cancelled | ✅ |
| 9 | Browser | open Annual Dance Fest | "Hosted by Dance Club" | shown | ✅ |
| 10 | Browser | click Register | "Registered", 40 → 39 seats, toast | as expected, toast "You're registered for Annual Dance Fest" | ✅ |
| 11 | Browser | reload | still "Registered" | still "Registered" | ✅ |
| 12 | Browser | Cancel → Yes, cancel | confirm prompt, back to Register, 40 seats | as expected | ✅ |
| 13 | Browser | 24-Hour Hackathon (full) | "Event Full" disabled | disabled | ✅ |
| 14 | Browser | register on Dance Workshop (1 left) | succeeds, card → Full | card "Full" | ✅ |
| 15 | Browser | E-Sports Night (cancelled) | banner + disabled | as expected | ✅ |
| 16 | Browser | Spring Hackathon (past + full) | "Event Passed" disabled | first run "Event Full" ❌ → fixed → "Event Passed" | ✅ after fix |
| 17 | Browser | `/events/999` | Event not found | as expected | ✅ |

## Results
2026-09-23 · Vitest 9/9 · browser 9/9 after one fix (label priority for past events).

## Open questions
- F14 on the dashboard (a staff-cancelled registration showing "Cancelled") can only be tested once Manage Events (O6) exists.
