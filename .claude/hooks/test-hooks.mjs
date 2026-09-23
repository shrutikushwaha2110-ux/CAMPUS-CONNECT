// Test cases for the project hooks (Day 2 deliverable).
// Feeds each hook the same JSON Claude Code sends on stdin and checks the exit code.
// Run: node .claude/hooks/test-hooks.mjs
import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const abs = rel => join(ROOT, rel); // real Windows-style absolute path, like Claude Code sends

function fire(hook, tool, filePath) {
  const payload = JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { file_path: filePath }, cwd: ROOT });
  const r = spawnSync(process.execPath, [join(HERE, hook)], { input: payload, encoding: 'utf8' });
  return { code: r.status, stderr: r.stderr.trim() };
}

const probe = abs('src/lib/zzHookProbe.test.ts');
const approved = join(HERE, 'approved-edits.txt');
let saved = '';
const cases = [
  { id: 'TC1', hook: 'protect-files.mjs', tool: 'Edit', file: abs('SPEC.md'), expect: 2, what: 'Edit SPEC.md is blocked' },
  { id: 'TC2', hook: 'protect-files.mjs', tool: 'Write', file: abs('src/data/clubs.json'), expect: 2, what: 'Write seed JSON (not approved) is blocked' },
  {
    id: 'TC8', hook: 'protect-files.mjs', tool: 'Edit', file: abs('src/data/units.json'), expect: 0, what: 'A file the team lists in approved-edits.txt is allowed',
    setup: () => { saved = readFileSync(approved, 'utf8'); writeFileSync(approved, `${saved}\nsrc/data/units.json\n`); },
    teardown: () => writeFileSync(approved, saved),
  },
  { id: 'TC9', hook: 'protect-files.mjs', tool: 'Edit', file: abs('src/data/units.json'), expect: 2, what: '...and is locked again once removed from the list' },
  { id: 'TC3', hook: 'protect-files.mjs', tool: 'Edit', file: abs('src/pages/Home.tsx'), expect: 0, what: 'Edit a page is allowed' },
  { id: 'TC4', hook: 'protect-files.mjs', tool: 'Edit', file: abs('docs/SPEC.md.notes'), expect: 0, what: 'Similar name is not blocked' },
  { id: 'TC5', hook: 'run-lib-tests.mjs', tool: 'Edit', file: abs('src/lib/seats.ts'), expect: 0, what: 'lib edit + green tests passes' },
  { id: 'TC6', hook: 'run-lib-tests.mjs', tool: 'Edit', file: abs('src/pages/Home.tsx'), expect: 0, what: 'non-lib edit skips tests' },
  {
    id: 'TC7', hook: 'run-lib-tests.mjs', tool: 'Edit', file: abs('src/lib/seats.ts'), expect: 2, what: 'lib edit + red test is reported',
    setup: () => writeFileSync(probe, "import { it, expect } from 'vitest';\nit('probe', () => expect(1).toBe(2));\n"),
    teardown: () => rmSync(probe, { force: true }),
  },
];

let failed = 0;
for (const c of cases) {
  c.setup?.();
  const r = fire(c.hook, c.tool, c.file);
  c.teardown?.();
  const ok = r.code === c.expect;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.id}  ${c.what}  (exit ${r.code}, expected ${c.expect})${r.stderr ? `\n        stderr: ${r.stderr.split('\n')[0]}` : ''}`);
}
console.log(`\n${cases.length - failed}/${cases.length} hook test cases passed`);
process.exit(failed ? 1 : 0);
