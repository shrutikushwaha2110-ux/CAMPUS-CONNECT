# CampusConnect

Event, club and unit discovery for Atria University, with a Three.js hero. Built from our Figma Make design with Claude Code.
*Unofficial student project. Clubs and events are sample data.*

**Live site:** _add the Vercel link here_

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 48 Vitest tests for the rules in src/lib
npm run test:hooks # 7 test cases for the Claude Code hooks
npm run build      # typecheck + production build → dist/
```

Reset the demo: DevTools → Application → Local Storage → clear the `campusconnect.*` keys.

## Pages

`/` Home · `/events` · `/events/:id` · `/clubs` · `/units` · `/dashboard` · `/login` · anything else → 404
(Hash URLs: `http://localhost:5173/#/events`)

## Docs

| File | What's in it |
|---|---|
| [SPEC.md](SPEC.md) | What we're building: visitors, pages, requirement IDs, data, rules |
| [CLAUDE.md](CLAUDE.md) | How Claude Code must work in this repo |
| [TESTS.md](TESTS.md) | Every test case with real results |
| [MCP_LOG.md](MCP_LOG.md) | Every MCP tool used |
| [docs/DELIVERABLES.md](docs/DELIVERABLES.md) | Day 1–3 checklist → file map, and what's left |
| [docs/features/](docs/features/) | Spec → test cases → results, per feature |
| [docs/HOOKS.md](docs/HOOKS.md) · [docs/SUBAGENTS.md](docs/SUBAGENTS.md) | Day 2 and Day 3 automation |
