// PreToolUse hook (Edit|Write|MultiEdit): blocks edits to files the team owns by hand.
// SPEC.md is the team's source of truth; src/data/*.json is seed data designed so every rule can be demoed.
// A protected file can be unlocked only by listing it in approved-edits.txt (a team decision, visible in git).
// Exit code 2 = block the tool call and show stderr to Claude.
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..').replace(/\\/g, '/');
const LOG = join(HERE, 'hook-log.txt');
const PROTECTED = [
  { test: p => /(^|\/)SPEC\.md$/i.test(p), why: 'SPEC.md is written by the team. Propose the change in chat instead.' },
  { test: p => /(^|\/)src\/data\/[^/]+\.json$/i.test(p), why: 'Seed data is designed so every SPEC rule can be demoed. Ask the team before changing it.' },
];

function approvedPaths() {
  try {
    return readFileSync(join(HERE, 'approved-edits.txt'), 'utf8')
      .split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .map(l => l.replace(/\\/g, '/').toLowerCase());
  } catch {
    return [];
  }
}

let raw = '';
process.stdin.on('data', c => (raw += c));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch {
    appendFileSync(LOG, `${new Date().toISOString()} protect-files SKIP unreadable hook input\n`);
    process.exit(0);
  }
  const path = String(input.tool_input?.file_path ?? '').replace(/\\/g, '/');
  // Claude Code sends a session_id; the test script (test-hooks.mjs) does not
  const src = input.session_id ? 'live' : 'test';
  const hit = PROTECTED.find(r => r.test(path));
  const stamp = new Date().toISOString();

  if (!hit) {
    appendFileSync(LOG, `${stamp} protect-files[${src}] ALLOW ${input.tool_name} ${path}\n`);
    process.exit(0);
  }
  const rel = path.toLowerCase().startsWith(ROOT.toLowerCase() + '/') ? path.slice(ROOT.length + 1) : path;
  if (approvedPaths().includes(rel.toLowerCase())) {
    appendFileSync(LOG, `${stamp} protect-files[${src}] ALLOW (team-approved) ${input.tool_name} ${path}\n`);
    process.exit(0);
  }
  appendFileSync(LOG, `${stamp} protect-files[${src}] BLOCK ${input.tool_name} ${path}\n`);
  console.error(`Blocked by protect-files hook: ${path}\n${hit.why}\n(To unlock, the team adds the path to .claude/hooks/approved-edits.txt.)`);
  process.exit(2);
});
