# CampusConnect for Atria University

A multi-page React site where students find and register for university events, join clubs, and follow units. Club Managers and Faculty manage events, and Faculty also manage clubs. This is an unofficial student project, and all clubs and events are sample data.

**`SPEC.md` is the source of truth** for pages, requirement IDs (F1, O1, C1, N1 …), data, and rules (§7). If the code and SPEC.md disagree, or a request isn't in SPEC.md, say so and ask before building. **Never edit SPEC.md.** A hook blocks it, so don't try to work around the hook.

## Stack

- React 19 + Vite 7 + **TypeScript** (strict). The Figma Make export was TypeScript, so we kept it.
- React Router v7 with **`createHashRouter`**. URLs are `/#/events/…`. Don't switch to a browser router, because deep links would then need host rewrites.
- Tailwind CSS v4 (`@tailwindcss/vite`), mobile-first: design for 375 px first. Brand colours are tokens in `src/index.css` (`--color-primary: #4637D2`, `--color-night: #1C1750` …).
- Three.js for the Home hero only (`src/components/3d/HeroScene.tsx`), lazy-loaded with `React.lazy`.
- No backend. Data is `src/data/*.json` plus localStorage.
- Tests: Vitest (`src/lib/*.test.ts`, node environment) plus the manual log in `TESTS.md`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server (Vite, default port 5173; the preview config uses 5180) |
| `npm test` | Runs all Vitest tests once. Must pass before any commit. |
| `npm run build` | `tsc --noEmit` then `vite build`. Must pass before any PR. |
| `npm run preview` | Serves the built `dist/` locally |

## Structure

```
src/
  app/routes.ts        all routes (hash router). Root layout wraps every page except /login
  pages/               one file per route: Home, Events, EventDetails, Clubs, Units, Dashboard, Login, NotFound, Root
  components/          display only: Navbar, Footer, Logo, EventCard, EventPoster, CategoryBadge, SeatsBadge, FilterChip, SearchBar, ClubTile
  components/3d/       HeroScene.tsx: Three.js scene, no business rules inside
  hooks/               state + localStorage merge: useEvents, useClubs, useRegistrations, useMemberships, useSession
  lib/                 pure rules, no React: seats, eventFilter, permissions, validation, storage, date, constants (+ *.test.ts)
  data/                events.json, clubs.json, units.json, types.ts
  assets/              logo1.png, logo2.png (logo used in navbar/login), design-ref.png from Figma
docs/                  deliverables: features/ (per-feature spec→tests→results), DELIVERABLES.md, HOOKS.md, SUBAGENTS.md
.claude/               hooks/, agents/, skills/, settings.json, launch.json
SPEC.md  CLAUDE.md  TESTS.md  MCP_LOG.md  README.md
```

### How the layers work together

- **Rules live in `src/lib/`.** Seats left (`seats.ts`), list sorting/search/filters (`eventFilter.ts`), "can this person manage this event/club" (`permissions.ts`), and form validation (`validation.ts`) are plain functions. Pages and components call them and never re-implement a rule inline.
- **Hooks own state.** They read JSON + localStorage, merge them (local wins by `id`, deleted clubs are dropped), and hand data to pages.
- **Components only display.** Props in, callbacks out.
- **All localStorage goes through `lib/storage.ts`**, wrapped in try/catch, with the exact `campusconnect.*` keys from SPEC §6.
- **"Today" comes from `getToday()` in `lib/date.ts`.** Functions that depend on the date take an optional `today` argument so tests can fix it (tests use `'2026-11-01'`). Dates are `YYYY-MM-DD` and times are 24-hour `HH:mm`.
- Categories, roles and host types come from `lib/constants.ts`. Never type them as loose strings.

## Figma-generated code

The UI came from the Figma Make file `ej75XJhPL0fvejEo92cI3I` ("Add Logo and Name") via the Figma MCP (`get_design_context`, which returns the Make source files). Visual layout, colours, spacing and inline styles in `pages/` and `components/` are **the design**:

- Don't restyle or re-layout Figma-derived components unless asked. If the design changes, re-pull from Figma and diff, rather than patching by eye.
- Logic changes (wiring filters, fixing rules) are fine; keep the markup and styles as they are.
- Changes we already made on top of the export, so don't revert them: working date/host filters and host-name search in `Events.tsx`, soonest-first sorting in `useEvents`, the "Event Passed" label taking priority over "Event Full", the unit name (not id) on club cards, `<Link>` in `Logo`, `role="status"` on toasts, `aria-label`s on selects, and the lazy-loaded HeroScene.

## 3D rules

- Three.js lives only in `components/3d/`. Never put essential text or controls in the canvas.
- Keep the scene light: 8 shapes + 200 particles on desktop, and 4 shapes with no particles under 600 px.
- `prefers-reduced-motion` stops all motion. If WebGL creation throws, the component returns nothing and the page still works (tested; see TESTS.md N4).
- Every scene disposes its renderer, geometries, listeners and animation frame on unmount.

## Roles & access

`/login` is a demo role picker, not real auth. The session is saved via `useSession` → `storage.setSession` as `{ role, clubId?, unitId? }`. The navbar shows the active role and a **Switch role** button. When manage/faculty pages are built, route access must be checked from the session using `lib/permissions.ts`, not by just hiding links (SPEC rule 17).

## Ask first, never do silently

- Editing `SPEC.md` (hook-blocked), `CLAUDE.md`, anything in `.claude/` (hooks, agents, skills, settings)
- Changing `src/data/*.json` (hook-blocked: seed data is designed so every rule can be demoed; changing IDs breaks tests)
- Adding, removing or upgrading a dependency in `package.json`
- Deleting files, or rewriting a file that already works
- Anything with tokens, `.env` files or secrets. Never write a token into a file in this repo.
- Building pages or features not listed in SPEC.md. S1 (clash warning) stays off unless we say so.

## Git rules

- One feature per commit or PR, named by requirement ID: `F5: register for an event`.
- Commit messages are short and in the imperative ("Add seats left calculation").
- Before any push, show the diff and a one-line summary, then wait for a teammate's go-ahead.
- `npm test` and `npm run build` must pass first.
- Never force-push, and never use `--no-verify`.

## Naming

- Components and pages: `PascalCase.tsx`. Hooks: `useThing.ts`. Lib files: `camelCase.ts`. Tests go next to their file: `seats.test.ts`.
- Data fields use the camelCase names from SPEC §6 (`seatsTotal`, `hostType`, `unitId`).
- Roles are `student`, `clubManager`, `faculty`. Host types are `club` and `unit`. Host filter values are `club:<id>` or `unit:<id>`.
- Routes match SPEC §4 exactly.

## Definition of "done" for a feature

Never say "done" before all of these are true:

1. The rule is in `src/lib/` with Vitest tests for the normal case and the SPEC §7 edge cases, and `npm test` passes.
2. The UI works at 375 px (no sideways scroll) and on desktop, and `npm run build` passes.
3. It was actually run in the browser and a row was added to `TESTS.md` with the ID, the input, what was expected, and **what actually happened**. Never fill in "Actual" from assumption. Record failures honestly.
4. Any MCP tool used is logged in `MCP_LOG.md` (date, server, tool, purpose, result).
5. You explained in plain language what each changed file does, so any of us can repeat it without Claude.

## Project automation (Day 2–3)

- **Hooks** (`.claude/settings.json`, scripts in `.claude/hooks/`, details in `docs/HOOKS.md`):
  - `protect-files.mjs` (PreToolUse, Edit|Write) blocks edits to `SPEC.md` and `src/data/*.json`.
  - `run-lib-tests.mjs` (PostToolUse, Edit|Write) runs `npm test` after any change in `src/lib/` and reports failures back.
  - Both append to `.claude/hooks/hook-log.txt` as proof that they fired.
- **Subagents** (`.claude/agents/`): `spec-test-writer` (spec → Vitest tests), `test-runner` (runs tests and records results in TESTS.md), `ui-checker` (375 px, footer, a11y checks in the browser).
- **Skill** (`.claude/skills/sdd-feature/`): `/sdd-feature <ID>` runs spec → test cases → run → record for one requirement.

## Who owns what

- Figma design: Shruti
- Student pages and logic: Raju
- Staff pages (manage events, faculty clubs): Sohail
- Testing, TESTS.md, MCP_LOG.md: Shruti, Raju, Sohail
