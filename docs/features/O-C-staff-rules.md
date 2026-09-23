# O1–O8, C1–C5: Staff rules (logic only, pages not built yet)

**Requirements (SPEC §5):** O2 invalid event form · O3/O4 edit scope · O5 seats ≥ taken · C1/C2 club add and validation · C5 club scope
**Rules (SPEC §7):** 12, 13, 14, 15, 17, 18, 19
**Code:** `src/lib/permissions.ts` · `src/lib/validation.ts`

## What it does
Pure functions that the future `/manage` and `/faculty` pages must call:
`canManageEvent`, `canManageClub`, `allowedHosts`, `validateEvent`, `validateClub`.

## What "correct" means
- A Club Manager manages only their own club's events. Faculty manage their own unit's events plus those of clubs whose `unitId` is theirs. Students manage nothing.
- A Club Manager's only host option is their club. Faculty can choose their unit or its clubs.
- Event form: title, category from the list, date ≥ today, time, venue, description, seats ≥ 1, and seats ≥ seats already taken.
- Club form: unique name (case-insensitive, but it may keep its own name when edited), club category, description, manager name.

## Test cases (Vitest)
| # | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| 1 | Dance mgr → Dance event | allowed | true | ✅ |
| 2 | O4 Dance mgr → Music event | blocked | false | ✅ |
| 3 | O4 Dance mgr → Beyonder unit event | blocked | false | ✅ |
| 4 | O3 Entrepreneurship faculty → Music event | allowed | true | ✅ |
| 5 | O4 Life Sciences faculty → Music event | blocked | false | ✅ |
| 6 | Beyonder faculty → Beyonder event | allowed | true | ✅ |
| 7 | Student → any event | blocked | false | ✅ |
| 8 | Entrepreneurship faculty → Dance Club | allowed | true | ✅ |
| 9 | C5 Life Sciences faculty → Dance Club | blocked | false | ✅ |
| 10 | Club Manager → manage clubs | blocked | false | ✅ |
| 11 | allowedHosts Dance mgr | [Dance Club] | [Dance Club] | ✅ |
| 12 | allowedHosts Entrepreneurship | unit + 3 clubs | as expected | ✅ |
| 13 | allowedHosts student | [] | [] | ✅ |
| 14 | valid event | no errors | {} | ✅ |
| 15 | O2 seats = 0 | seats error | error | ✅ |
| 16 | O2 past date | date error | error | ✅ |
| 17 | today's date | allowed | {} | ✅ |
| 18 | O2 blank title | title error | error | ✅ |
| 19 | bad category | category error | error | ✅ |
| 20 | O5 seats 50 < taken 81 | seats error | error | ✅ |
| 21 | O5 seats = taken | allowed | {} | ✅ |
| 22 | C1 "Photography Club" | valid | {} | ✅ |
| 23 | C2 "dance club" | duplicate error | error | ✅ |
| 24 | edit Dance Club keeping its name | valid | {} | ✅ |
| 25 | C2 blank manager | error | error | ✅ |
| 26 | club category "Workshop" | error | error | ✅ |

## Results
2026-09-23 · Vitest 26/26 pass. UI cases (O1, O6–O8, C3, C4, route blocking) are **not run**, because the pages don't exist yet (owner: Sohail).
