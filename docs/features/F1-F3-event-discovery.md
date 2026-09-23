# F1–F3: Event discovery (list, search, filters)

**Requirements (SPEC §5):** F1 upcoming list soonest-first · F2 keyword search (title, category, host name) · F3 filter by category, date and host
**Rules (SPEC §7):** 8 (sorted, no past events) · 9 (empty state, not blank)
**Code:** `src/lib/eventFilter.ts` → `useEvents` (`upcomingEvents`) → `src/pages/Events.tsx`

## What it does
Shows every upcoming event as a card. The visitor can narrow the list with a keyword, a category chip, a date range, and a host (a club or a unit). Filters combine, and they live in the URL (`?q=&cat=&date=&host=`) so a refresh keeps them.

## Inputs
| Input | Values |
|---|---|
| `q` keyword | any text; trimmed and case-insensitive |
| `cat` category | `All` or one of the 6 event categories |
| `date` | `any` · `week` (today to +7 days) · `month` (today to +30 days) |
| `host` | `''` (all) or `club:<id>` / `unit:<id>` |
| today | from `getToday()`; tests pass `2026-11-01` |

## What "correct" means
- Events with `date < today` never appear. The rest are sorted by `date + time`, ascending.
- A keyword matches if it appears in the title, the category, **or the host's display name** ("Beyonder" finds Beyonder Studios events).
- Every active filter must match (AND).
- No matches → "No events match your search" and a Clear filters button.
- Cancelled events still appear, with a "Cancelled" badge (so students see F14).

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Vitest | seed data, today 2026-11-01 | past-hackathon hidden | hidden | ✅ |
| 2 | Vitest | same | list sorted by date+time | sorted | ✅ |
| 3 | Vitest | same | first = Annual Dance Fest | Annual Dance Fest | ✅ |
| 4 | Vitest | q = "Dance" | exactly the 2 dance events | 2 dance events | ✅ |
| 5 | Vitest | q = "Beyonder" | host-name match (2 events) | 2 events | ✅ |
| 6 | Vitest | q = "guest talk" | category match → AI Ethics talk | AI Ethics talk | ✅ |
| 7 | Vitest | q = "zzzz" | 0 results | 0 | ✅ |
| 8 | Vitest | host = club:music-club | Open Mic + Battle of Bands | those 2 | ✅ |
| 9 | Vitest | host = unit:beyonder-studios | 2 events | 2 | ✅ |
| 10 | Vitest | cat = Workshop | 2 workshops only | 2 | ✅ |
| 11 | Vitest | date = week | all ≤ 2026-11-08 | true | ✅ |
| 12 | Vitest | date = month | Dance Fest in, Career Fair out | as expected | ✅ |
| 13 | Vitest | cat Workshop + host Dance Club | only Dance Workshop | Dance Workshop | ✅ |
| 14 | Browser | open `/events` | 13 events, soonest first | Annual Dance Fest … Career Fair | ✅ |
| 15 | Browser | search "Dance" | 2 cards | 2 cards | ✅ |
| 16 | Browser | search "zzzz" | empty state | "No events match your search" | ✅ |
| 17 | Browser | host = Music Club | Music Club only | Open Mic, Battle of Bands | ✅ |
| 18 | Browser | chip Workshop | workshops only | Maker Tools, Dance Workshop | ✅ |

## Results
2026-09-23 · Vitest 13/13 · browser 5/5 · all pass.
Bugs fixed while writing this spec: the list was unsorted, the date/host dropdowns did nothing, and search matched the host id instead of the host name.

## Open questions
- "This week" means the next 7 days, not the calendar week. Does the team agree?
