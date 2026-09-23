# A1 + R17: Separate role logins and protected dashboards

**Requirements (SPEC §5):** A1 separate login per role, session, role visible, switch role · R17 protected routes
**Rules (SPEC §7):** 17, 26 · **Code:** `lib/auth.ts` · `pages/Login.tsx` (`Login`, `RoleLogin`) · `components/RequireRole.tsx` · `app/routes.tsx` · `components/Navbar.tsx`

## What it does
- `/login` offers three cards.
- Each card opens its own page: `/login/student`, `/login/club-manager` and `/login/faculty`, with an email + password form.
- `authenticate()` accepts an account only on the page for its role.
- The session `{userId, role, clubId?}` is saved, and `validateSession()` re-checks it on every load.
- Each role lands on its own dashboard: `/dashboard`, `/manage` or `/faculty`.
- The navbar shows name · role · club and a Log out button.
- Protected routes are wrapped in `RequireRole`:
  - logged out → redirect to that role's login with `?next=`
  - wrong role → "Not available for your role".

## Inputs
Email, password, which login page · users from `users.json` + `userChanges` · live club IDs

## What "correct" means
- Wrong password → "Email or password is incorrect."
- The right account on the wrong page → "This account is not a … account".
- A deactivated account → refused. A manager whose club was deleted → refused.
- The session survives reload. A deactivated user's open session ends.
- Typing a restricted URL never shows the page.

## Test cases
| # | Type | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1–10 | Vitest `auth.test.ts` | valid logins per role, wrong password, wrong page, deactivated, deleted club, session re-validation | as spec | 10/10 | ✅ |
| 11 | e2e | open `/login` | 3 role cards | student, clubManager, faculty | ✅ |
| 12 | e2e | student page, wrong password | error | "Email or password is incorrect." | ✅ |
| 13 | e2e | student account on faculty page | error | "This account is not a Faculty/Admin account. Use the login page for your role." | ✅ |
| 14 | e2e | log in as each role | own dashboard | #/dashboard, #/manage, #/faculty | ✅ |
| 15 | e2e | Dance manager, reload | still logged in, pill visible | "Priya Sharma · Club Manager · Dance Club" | ✅ |
| 16 | e2e | logged out → `/dashboard` | redirect | #/login/student?next=%2Fdashboard | ✅ |
| 17 | e2e | Dance manager → Music registrations / Music edit / `/faculty/clubs` | blocked | all 3 "Not available" | ✅ |
| 18 | e2e | Raju deactivated, tries to log in | refused | "This account has been deactivated…" | ✅ |

## Results
2026-09-23 · Vitest 10/10 · e2e 9/9 · screenshots `02-login-chooser.png`, `07-manager-blocked-other-club.png`.
