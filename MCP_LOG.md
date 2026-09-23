# MCP & plugin log

Every MCP tool call used to build the project: date, server, tool, what it was for, and the result.

| # | Date | Server | Tool | What for | Result |
|---|---|---|---|---|---|
| 1 | 2026-09-23 | Figma (plugin `figma@claude-plugins-official` v2.2.111) | skill `figma-design-to-code` | Loaded the Figma design-to-code workflow before reading the design (the plugin requires it) | Loaded ✅ |
| 2 | 2026-09-23 | Figma MCP | `get_design_context` (fileKey `ej75XJhPL0fvejEo92cI3I`, node `0:1`) | Read the Figma Make file "Add Logo and Name" | Returned 50+ resource links: all source files, data, and images of the Make project ✅ |
| 3 | 2026-09-23 | Figma MCP | `ReadMcpResource` × ~40 (`file://figma/make/source/…`) | Pulled each source file: `App.tsx`, `routes.ts`, 9 pages, 10 components, `HeroScene.tsx`, 5 hooks, 5 lib files, 3 JSON data files, `index.css`, draft `SPEC_1_.md` and `CLAUDE_1_.md` | All files read and written into `src/` ✅ |
| 4 | 2026-09-23 | Figma MCP | `ReadMcpResource` (binary) | Downloaded `logo1.png`, `logo2.png`, `design-ref.png` | Saved to `src/assets/` ✅ |
| 5 | 2026-09-23 | Claude Browser (built-in) | `preview_start`, `javascript_tool`, `resize_window`, `computer` (screenshot), `read_console_messages` | Ran the site and executed the manual test cases in TESTS.md at desktop and 375 px | 35 manual checks recorded; 1 bug found and fixed (rule 4 label) ✅ |

## Still to do (team, needs your GitHub account)

The GitHub MCP is **not connected** in this Claude Code session, so these Day 1 steps are still open. Connect it (`claude mcp add` for the GitHub MCP server, or via claude.ai connectors), then log each call here:

| # | Date | Server | Tool | What for | Result |
|---|---|---|---|---|---|
| 6 | | GitHub MCP | `create_repository` | Create `campusconnect` repo | |
| 7 | | GitHub MCP | `push_files` / `create_or_update_file` | Initial commit on `main` | |
| 8 | | GitHub MCP | `create_branch` | e.g. `feature/f3-filters` | |
| 9 | | GitHub MCP | `create_pull_request` | "F3: working date and host filters" | |
| 10 | | GitHub MCP | `merge_pull_request` | Merge the PR | |

## Plugin used (Day 3)

**Figma plugin** (`figma@claude-plugins-official`): installed, then used in step 1–4 above. Its `figma-design-to-code` skill fired and its MCP server returned the design source. **Screenshot to take:** run `/plugin` in a Claude Code terminal to show it installed, and take a screenshot of the transcript where `figma-design-to-code` launched and `get_design_context` returned the file list.
