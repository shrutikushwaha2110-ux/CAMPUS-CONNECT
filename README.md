# CampusConnect

Events, clubs and units for Atria University, with **separate logins and dashboards for Students, Club Managers and Faculty/Admin**, and a Three.js hero. Built from our Figma Make design with Claude Code.
*Unofficial student project. Clubs, events and accounts are sample data.*

**Live site:** _add the deployed link here_ (needs a Node host with a disk, e.g. Render / Railway: build `npm install && npm run build`, start `npm start`)

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (site + API + SQLite database, one process)
npm run db:reset     # wipe + re-seed the database (demo accounts back, sign-ups gone)
npm run build && npm start   # production: API + site on http://localhost:3000
npm test             # 127 tests: rules in src/lib + API tests against a real SQLite DB
npm run test:e2e     # 40 real-browser scenarios incl. sign-up (uses your Chrome, temporary DB)
npm run test:hooks   # 9 test cases for the Claude Code hooks
npm run build        # typecheck + production build → dist/
npm run proof        # re-render the proof screenshots in docs/screenshots/deliverables
```

## Demo logins (`/#/login`)

| Role | Email | Password | Lands on |
|---|---|---|---|
| Student | shruti@student.atria.edu (also raju@, sohail@, ananya@) | demo123 | `/dashboard` |
| Club Manager | dance.manager@atria.edu (also music., literature., sports., esports., hackathon.) | demo123 | `/manage` (Manage club + Events only) |
| Faculty (head of Dance Club) | admin@atria.edu (also meera.nair@ → Music, vikram.shah@ → Hackathon…) | admin123 | `/faculty` |

**New users:** click **Create an account** on `/#/login` (or "Sign up" on any login page). Students can log in straight away; Club Manager / Faculty sign-ups appear under **Users → Sign-up requests** for approval.

Data lives in `server/data/campusconnect.db` (SQLite). Passwords are stored only as salted scrypt hashes. Reset with `npm run db:reset`.

## Docs

| File | What's in it |
|---|---|
| [SPEC.md](SPEC.md) | Roles, pages, requirement IDs, data, rules |
| [CLAUDE.md](CLAUDE.md) | How Claude Code must work in this repo |
| [TESTS.md](TESTS.md) · [docs/E2E_RESULTS.md](docs/E2E_RESULTS.md) | Every test with real results |
| [MCP_LOG.md](MCP_LOG.md) | MCP / plugin / git log |
| [docs/DELIVERABLES.md](docs/DELIVERABLES.md) | Day 1–3 checklist → where each deliverable is |
| [docs/features/](docs/features/) | Spec → test cases → results, per feature |
| [docs/HOOKS.md](docs/HOOKS.md) · [docs/SUBAGENTS.md](docs/SUBAGENTS.md) | Day 2 and Day 3 automation |
| [docs/screenshots/](docs/screenshots/) | Site screenshots (from the e2e run) + deliverable proof images |
