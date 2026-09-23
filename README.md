# CampusConnect

Events, clubs and units for Atria University, with **separate logins and dashboards for Students, Club Managers and Faculty/Admin**, and a Three.js hero. Built from our Figma Make design with Claude Code.
*Unofficial student project. Clubs, events and accounts are sample data.*

**Live site:** _add the deployed link here_

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # 108 unit tests (rules in src/lib)
npm run test:e2e     # 34 real-browser scenarios for every role (uses your Chrome)
npm run test:hooks   # 9 test cases for the Claude Code hooks
npm run build        # typecheck + production build → dist/
npm run proof        # re-render the proof screenshots in docs/screenshots/deliverables
```

## Demo logins (`/#/login`)

| Role | Email | Password | Lands on |
|---|---|---|---|
| Student | shruti@student.atria.edu (also raju@, sohail@, ananya@) | demo123 | `/dashboard` |
| Club Manager | dance.manager@atria.edu (also music., literature., sports., esports., hackathon.) | demo123 | `/manage` (own club only) |
| Faculty / Admin | admin@atria.edu | admin123 | `/faculty` |

Reset the demo: DevTools → Application → Local Storage → clear the `campusconnect.*` keys.

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
