# S1, F5a, F9a, F10: Student rules and dashboard

**Requirements:** S1 see all events and clubs · F5a register for any club's event · F9a join max 2 clubs, with both rules written on the page · F10 student dashboard
**Rules:** 10, 10a, 11, 21 · **Code:** `lib/memberships.ts` (`joinBlockReason`, `clubsOf`, `memberCount`) · `lib/registrations.ts` (`registerBlockReason`) · `components/StudentRules.tsx` · `pages/Clubs.tsx` · `pages/Dashboard.tsx`

## What it does
- A logged-in student sees every event and club.
- **Registration never checks club membership.**
- Joining a club is blocked once the student has 2 live memberships: the button turns to a disabled "Limit reached", and the banner says "You've joined 2 of 2. Leave a club to join a different one."
- The two rules appear word-for-word on `/clubs` and `/dashboard`:
  - "You can join a maximum of 2 clubs."
  - "You can attend/register for events from any club."
- The dashboard shows:
  - registrations with status (Confirmed / Pending approval / Rejected / Cancelled by organiser)
  - clubs x/2 with Leave
  - "Upcoming events for you", with your clubs first
  - announcements (university + your clubs)
  - followed units

## What "correct" means
- The limit counts only *live* clubs, so a club deleted by faculty frees the slot.
- Other students' memberships don't count toward mine.
- Leaving asks "Are you sure?" and frees a slot.
- At the limit I can still register for any club's event.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1–9 | Vitest `memberships.test.ts` | 0/1/2 clubs, other users, deleted club, duplicate, staff, logged out, counts | as spec | 9/9 | ✅ |
| 10 | Vitest `registrations.test.ts` | student with no clubs registers for Music event | allowed | null (allowed) | ✅ |
| 11 | e2e S1 | student opens /events and /clubs | all events + clubs + both rules | 13 events, 6 clubs, both rule sentences | ✅ |
| 12 | e2e F5a | Shruti (no clubs) registers for Open Mic (Music Club) | Confirmed | Confirmed, listed on dashboard | ✅ |
| 13 | e2e F9a | join Dance, Music, try Sports | Sports blocked | "Limit reached" (disabled); "You've joined 2 of 2" | ✅ |
| 14 | e2e F9a | at the limit, register for Football Cup (Sports) | allowed | Confirmed | ✅ |
| 15 | e2e F9 | leave Music (confirm) | Sports re-enabled | "Join" | ✅ |
| 16 | e2e F10 | open dashboard | all sections | registrations, for-you, My clubs (2/2), announcements, following | ✅ |

## Results
2026-09-23 · Vitest 10/10 · e2e 6/6 · screenshots `03-student-clubs-limit.png`, `04-student-dashboard.png`, `13-mobile-student-dashboard.png`.
