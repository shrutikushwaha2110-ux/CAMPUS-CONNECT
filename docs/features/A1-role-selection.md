# A1: Role selection

**Requirement (SPEC §5):** A1 pick Student, Club Manager (+club) or Faculty (+unit); remembered after refresh; active role visible; switch any time
**Code:** `useSession` · `lib/storage.ts` · `src/pages/Login.tsx` · `components/Navbar.tsx`

## What it does
`/login` offers three cards. Student logs in immediately. Club Manager and Faculty each open a second step with a required dropdown. The session is saved as `campusconnect.session`, and the navbar shows the role pill (the club or unit name) and a Switch role button.

## Inputs
Role card click · club/unit dropdown value

## What "correct" means
- Continue stays disabled until a club or unit is chosen.
- The stored session has exactly the SPEC §6 shape: `clubId` only for clubManager, `unitId` only for faculty.
- After reload the same role is shown.
- Switch role clears the session and goes to `/login`.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Browser | Club Manager → Dance Club → Continue | session saved, navbar "Dance Club" | `{"role":"clubManager","clubId":"dance-club"}`, pill shown | ✅ |
| 2 | Browser | reload | still Dance Club manager | unchanged | ✅ |
| 3 | Browser | Switch role | back to login, session null | `#/login`, `null` | ✅ |

## Results
2026-09-23 · browser 3/3 pass.

## Open questions
- Should the site force `/login` on first visit? At the moment a visitor can browse without choosing a role and is treated as a student.
