# CampusConnect for Atria University

A multi-page React site with **three roles, each with its own login and dashboard**:
- **Students** browse and register for any event, and join up to 2 clubs.
- **Club Managers** run exactly one club: its events, registrations, members and announcements.
- **Faculty/Admin** manage everything: clubs, events, users and announcements.

It's an unofficial student project, and all clubs, events and accounts are sample data.

**`SPEC.md` is the source of truth** for roles, pages, requirement IDs (A1, F9a, M3, C4, U1, N4 …), data and rules (§7). If the code and SPEC.md disagree, or a request isn't in SPEC.md, say so and ask before building. **SPEC.md and `src/data/*.json` are locked by a hook.** Never try to work around it; ask the team to approve the change (see Hooks).

## Stack

- React 19 + Vite 7 + **TypeScript** (strict). The Figma Make export was TypeScript, so we kept it.
- React Router v7, **`createHashRouter`** in `src/app/routes.tsx`. URLs are `/#/events/…`. Don't switch to a browser router, because deep links would then need host rewrites.
- Tailwind CSS v4. Figma colour tokens live in `src/index.css` (`bg-primary` = #4637D2, `bg-primary-dark`, `bg-primary-tint`, `text-text`, `text-text-muted`, `border-border`, night #1C1750).
- Three.js only in `src/components/3d/HeroScene.tsx`, lazy-loaded by Home.
- No backend. Seed data is `src/data/*.json` plus localStorage.
- Tests: Vitest (`src/lib/*.test.ts`), end-to-end with puppeteer-core in `tests/e2e/run.mjs`, and hook tests in `.claude/hooks/test-hooks.mjs`.

## Commands

| Command | What it does | When |
|---|---|---|
| `npm run dev` | Vite dev server (5173; the preview pane uses 5180) | while building |
| `npm test` | 108 Vitest tests for every rule in `src/lib` | after any logic change (a hook runs it automatically) |
| `npm run test:e2e` | Builds, serves `dist/`, drives Chrome through 34 role scenarios, writes `docs/E2E_RESULTS.md` + screenshots | before any PR / demo |
| `npm run test:hooks` | 9 test cases proving the hooks fire on the right events | after touching `.claude/hooks/` |
| `npm run build` | `tsc --noEmit` + production build → `dist/` | must pass before any PR |

## Architecture: where things live

```
src/
  app/routes.tsx       every route; protected ones wrapped in <RequireRole roles={…}>
  state/AppData.tsx    THE store: seed JSON + localStorage merged, session, and every action (register, joinClub, saveEvent, deleteClub…)
  hooks/               thin wrappers over the store: useEvents, useClubs, useRegistrations, useMemberships, useSession
  lib/                 pure rules, no React (each has *.test.ts):
                         seats · registrations · memberships · permissions · validation · auth · clubs · eventFilter · merge · storage · date · constants
  components/          Navbar (role-aware), Footer, EventCard, SeatsBadge, … (Figma-derived)
                       ui.tsx (Button, Card, Field, ConfirmDialog, Toast…), staff.tsx (EventsTable, SeatsBar, AnnouncementsList),
                       RequireRole.tsx (route guard + "Not available for your role"), StudentRules.tsx (the 2 student rules)
  components/3d/       HeroScene.tsx (Three.js only, no business rules)
  pages/               public + student: Home, Events, EventDetails, Clubs, Units, Dashboard (student), Login (+ RoleLogin), NotFound, Root
  pages/manage/        Club Manager (+ Faculty via shared routes): ManageHome, ClubAdminView, EventForm, EventRegistrations, AnnouncementForm
  pages/faculty/       Faculty/Admin: FacultyHome, ManageClubs, ClubForm, FacultyClubDetail, FacultyEvents, ManageUsers, FacultyAnnouncements
  data/                events, clubs, units, users, announcements (.json) + types.ts
tests/e2e/run.mjs      browser test suite
docs/                  E2E_RESULTS.md, features/, HOOKS.md, SUBAGENTS.md, DELIVERABLES.md, screenshots/, figma/
.claude/               settings.json (hooks), hooks/, agents/, skills/, launch.json
```

### The rules of the layers (don't break these)

1. **Every rule is a pure function in `src/lib/`, with a test.** Pages call `seatsLeft`, `registerBlockReason`, `joinBlockReason`, `canManageEvent`, `validateEvent` and so on. Never re-implement a rule inline (hard-coded `5`, `role === 'faculty'` checks scattered in JSX, seat arithmetic). The Explore subagent found exactly this in `FacultyHome.tsx` and three other places; it's fixed now, so keep it that way.
2. **Only `state/AppData.tsx` touches storage and seed JSON.** Pages never import `lib/storage` or write to localStorage. (Some Figma-derived pages still import `units.json` read-only for display; that's fine.)
3. **Actions validate again inside the store** (`register`, `joinClub`, `reviewRegistration`), so a UI bug can't break a rule.
4. **Components only display.** Props in, callbacks out.
5. **Dates** come from `getToday()` (`YYYY-MM-DD`). Lib functions take an optional `today`, and tests use `'2026-11-01'`.
6. **Constants** (categories, roles, `MAX_CLUBS_PER_STUDENT = 2`, `ALMOST_FULL_THRESHOLD = 5`, `ROLE_HOME`, `ROLE_SLUGS`) live in `lib/constants.ts`.

## Roles & access (SPEC §2, rules 12, 17, 18, 25, 26)

| | Student | Club Manager | Faculty/Admin |
|---|---|---|---|
| Login page | `/login/student` | `/login/club-manager` | `/login/faculty` |
| Home | `/dashboard` | `/manage` | `/faculty` |
| Scope | own registrations, clubs (max 2), follows | **only `session.clubId`** | everything |

- The session is `{ userId, role, clubId? }` in `campusconnect.session`, and it's **re-validated on every load** (`validateSession`): a deactivated user, a changed role or a deleted club ends it.
- Access is enforced **twice**:
  1. `RequireRole` on the route (logged out → role login with `?next=`; wrong role → "Not available for your role").
  2. Inside pages that show one club's or one event's private data (`canViewClubAdmin`, `canManageEvent`, `canManageAnnouncement`).

  A Club Manager typing `/manage/events/<other-club-event>/registrations` must be blocked. Keep both layers whenever you add a page.
- Faculty reuse the `/manage/events/*` and `/manage/announcements/*` pages with full scope.
- Passwords in `users.json` are **demo values, not security**. Never add real credentials or tokens anywhere.

## Figma-generated code

The UI came from the Figma Make file `ej75XJhPL0fvejEo92cI3I` ("Add Logo and Name") via the Figma MCP (`get_design_context` → Make source files). The design prompt text is kept in `docs/figma/`.

- Visual layout, colours and spacing of the Figma pages (Home, Events, EventDetails, Clubs, Units, EventCard, SeatsBadge, Navbar/Footer look) **are the design**. Don't restyle them unless asked; if the design changes, re-pull from Figma.
- Staff pages were built after Figma to match its tokens. Use `components/ui.tsx` for any new staff UI instead of new one-off styles.

## 3D rules

- The scene sits behind the hero; no essential text or controls go in the canvas.
- Desktop gets 8 shapes and 200 particles; under 600 px it gets 4 shapes and no particles.
- **Reduced motion** (`prefers-reduced-motion: reduce`): draw **one** frame and stop the RAF loop, and react live to the OS setting changing. `data-motion` / `data-frames` on the scene container exist so the e2e test can prove it. Don't remove them. `index.css` also switches off CSS transitions and hover lifts.
- If WebGL fails, the component renders nothing and the page still works.
- Dispose of the renderer, geometries, listeners and animation frames on unmount.

## Ask first, never do silently

- `SPEC.md`, `src/data/*.json`: **hook-locked**. Ask the team; they unlock one change by listing the path in `.claude/hooks/approved-edits.txt`, then remove it again.
- `CLAUDE.md`, and anything in `.claude/` (hooks, agents, skills, settings).
- Adding, removing or upgrading dependencies. Current dev deps include `puppeteer-core` (e2e) and `vitest`.
- Deleting files or rewriting a working file; changing IDs in seed data (tests and e2e rely on them).
- Tokens, `.env` files, secrets. Never write one into the repo.
- Features not in SPEC.md. S1 (clash warning) stays off.

## Git

- `main` is always deployable. Work on a branch (`feature/<id>-<short-name>`), open a PR, merge after review.
- One requirement per commit, with an imperative message naming the ID, e.g. `F9a: block joining a third club`.
- `npm test`, `npm run build` and (for UI changes) `npm run test:e2e` must pass before a PR.
- Show the diff and wait for a teammate's go-ahead before pushing. Never force-push, never use `--no-verify`.

## Naming

- Components and pages: `PascalCase.tsx`. Hooks: `useThing.ts`. Lib: `camelCase.ts` with a `camelCase.test.ts` beside it.
- Data fields are the camelCase names in SPEC §6. Roles are `student | clubManager | faculty`. Host filter values are `club:<id>` / `unit:<id>`.
- Test hooks: `data-testid`, `data-club`, `data-event-row`, `data-user`, `data-stat`, `data-error`. The e2e suite relies on them, so don't rename them without updating `tests/e2e/run.mjs`.

## Definition of done

1. The rule is in `src/lib/` with Vitest tests for the normal case and the SPEC §7 edge cases, and `npm test` passes.
2. The real browser flow is covered in `tests/e2e/run.mjs` (or run by hand), and the result is recorded in `docs/E2E_RESULTS.md` / `TESTS.md` with **what actually happened**. Never write "Pass" from assumption.
3. It works at 375 px (the e2e N1 check), and `npm run build` passes.
4. Any MCP tool used is logged in `MCP_LOG.md`.
5. You explained what each changed file does in plain language.

## Project automation

- **Hooks** (`.claude/settings.json`, details in `docs/HOOKS.md`):
  - `protect-files.mjs` (PreToolUse Edit|Write|MultiEdit) blocks `SPEC.md` and `src/data/*.json` unless they're listed in `approved-edits.txt`.
  - `run-lib-tests.mjs` (PostToolUse) runs Vitest after any `src/lib/*.ts` edit and feeds failures back.
  - Both log to `.claude/hooks/hook-log.txt`, tagged `[live]` (Claude Code) or `[test]` (test script).
- **Subagents** (`.claude/agents/`):
  - `spec-test-writer`: SPEC → Vitest tests.
  - `test-runner`: runs unit + e2e + build and records the real results.
  - `ui-checker`: checks 375 px, footer, a11y and role access in the browser.
- **Skill** (`.claude/skills/sdd-feature/`): `/sdd-feature <ID>` runs spec → test cases → run → record.
- **Plugin**: Figma (`figma@claude-plugins-official`), used to pull the design.

## Who owns what

- Figma design: Shruti
- Student pages and logic: Raju
- Staff pages (Club Manager + Faculty/Admin): Sohail
- Testing, TESTS.md, MCP_LOG.md: Shruti, Raju, Sohail
