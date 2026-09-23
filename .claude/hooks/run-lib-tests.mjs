// PostToolUse hook (Edit|Write|MultiEdit): after any change in src/lib/, run the Vitest suite.
// Rules live in src/lib/, so a rule change must never leave the tests red unnoticed.
// Exit code 2 = feed the failure back to Claude so it fixes it before moving on.
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LOG = join(HERE, 'hook-log.txt');

let raw = '';
process.stdin.on('data', c => (raw += c));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); }
  const path = String(input.tool_input?.file_path ?? '').replace(/\\/g, '/');
  // Claude Code sends a session_id; the test script (test-hooks.mjs) does not
  const src = input.session_id ? 'live' : 'test';
  if (!/\/src\/lib\/[^/]+\.ts$/.test(path) && !/^src\/lib\/[^/]+\.ts$/.test(path)) process.exit(0);

  const run = spawnSync('npx', ['vitest', 'run', '--reporter=dot'], { cwd: ROOT, encoding: 'utf8', shell: true });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  const summary = (output.match(/Tests\s+.*$/m)?.[0] ?? 'no summary').replace(/\x1b\[[0-9;]*m/g, '');
  const stamp = new Date().toISOString();

  if (run.status === 0) {
    appendFileSync(LOG, `${stamp} run-lib-tests[${src}] PASS after ${input.tool_name} ${path} | ${summary}\n`);
    process.exit(0);
  }
  appendFileSync(LOG, `${stamp} run-lib-tests[${src}] FAIL after ${input.tool_name} ${path} | ${summary}\n`);
  console.error(`Tests failed after editing ${path}:\n${output.replace(/\x1b\[[0-9;]*m/g, '').slice(-3000)}`);
  process.exit(2);
});
