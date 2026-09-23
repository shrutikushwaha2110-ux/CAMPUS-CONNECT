# MCP & plugin log

Every MCP tool / plugin used to build the project: date, server, tool, what it was for, and the result.

| # | Date | Server / plugin | Tool | What for | Result |
|---|---|---|---|---|---|
| 1 | 2026-09-23 | Figma plugin (`figma@claude-plugins-official` v2.2.111) | skill `figma-design-to-code` | Loaded the design-to-code workflow (required before reading the design) | Loaded ✅ |
| 2 | 2026-09-23 | Figma MCP | `get_design_context` (fileKey `ej75XJhPL0fvejEo92cI3I`, node `0:1`) | Read the Figma Make file "Add Logo and Name" | 50+ resource links: source, data, images ✅ |
| 3 | 2026-09-23 | Figma MCP | `ReadMcpResource` × ~40 | Pulled every source file (pages, components, HeroScene, hooks, lib, data, CSS, draft SPEC/CLAUDE) | Written into `src/` ✅ |
| 4 | 2026-09-23 | Figma MCP | `ReadMcpResource` (binary) | `logo2.png` (real PNG); `logo1.png` / `design-ref.png` turned out to be the design prompt text | Logo in `src/assets/`, prompts in `docs/figma/` ✅ |
| 5 | 2026-09-23 | Claude Browser (built-in) | `preview_start`, `javascript_tool`, `resize_window`, `computer`, `read_console_messages` | v1 manual tests; v2 smoke test of logins and manager scoping | v1: 35 checks; v2: logins + blocking verified ✅ |
| 6 | 2026-09-23 | MCP registry | `search_mcp_registry` ("github", "pull request") | Look for a GitHub connector to do the Day 1 GitHub steps | **None available**, so we used git + GitHub web instead (below) |
| 7 | 2026-09-23 | Plugin catalog | `SearchPlugins` ("agents-observe") | Install agents-observe for Day 2 | Not in catalog: install from a terminal (docs/HOOKS.md) |
| 8 | 2026-09-23 | Claude Code (built-in agent) | `Agent` → **Explore** subagent | Day 2: review where seat counts are calculated | Found 4 inline re-implementations → fixed ✅ |

## Git / GitHub

| # | Date | Tool | What | Result |
|---|---|---|---|---|
| G1 | 2026-09-23 | git | `git init -b main`, commit `457185a` "Add CampusConnect with role-based logins and staff pages" | ✅ |
| G2 | 2026-09-23 | git | branch `feature/v2-docs-and-seat-rules`, commits for seat-rule fix + docs | ✅ |
| G3 | | GitHub | push `main` + branch to the repo URL you share | waiting for the repo URL |
| G4 | | GitHub | open PR "v2 docs + centralise seat rules" → merge | after G3 |

> No GitHub MCP connector exists in this account's registry, and the `gh` CLI isn't installed, so the PR is opened and merged on github.com. If you later add a GitHub MCP server (`claude mcp add`), log the PR/merge calls here.
