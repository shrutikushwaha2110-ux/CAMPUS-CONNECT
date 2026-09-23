// Renders REAL command output / logs into PNG "proof" screenshots for the deliverables.
// Every image says what command produced it and when. Run: npm run proof
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots', 'deliverables');
mkdirSync(OUT, { recursive: true });
const chrome = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find(p => p && existsSync(p));
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = cmd => { try { return strip(execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); } catch (e) { return strip(`${e.stdout ?? ''}${e.stderr ?? ''}`); } };

function terminal(title, cmd, body, highlight = []) {
  const lines = esc(body).split('\n').map(l => {
    const cls = /\bFAIL\b|BLOCK|failed/.test(l) ? 'bad' : /\bPASS\b|✓|passed|ALLOW/.test(l) ? 'good' : '';
    const hl = highlight.some(h => l.includes(h)) ? ' hl' : '';
    return `<div class="${cls}${hl}">${l || '&nbsp;'}</div>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#F7F7FC;font-family:Inter,system-ui,sans-serif;padding:28px}
    .cap{font-size:13px;color:#454242;margin-bottom:10px}.cap b{color:#1C1750}
    .win{background:#1C1750;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(28,23,80,.25);max-width:1100px}
    .bar{background:#2B2093;color:#CBD5E1;padding:10px 16px;font-size:12px;display:flex;gap:8px;align-items:center}
    .dot{width:10px;height:10px;border-radius:50%;background:#EEECFB;opacity:.5}
    pre{margin:0;padding:18px 20px;color:#E2E8F0;font:13px/1.55 ui-monospace,Consolas,monospace;white-space:pre-wrap}
    .good{color:#86EFAC}.bad{color:#FCA5A5}.hl{background:rgba(250,204,21,.18);outline:1px solid rgba(250,204,21,.5)}
    .cmd{color:#A5B4FC}</style>
    <div class="cap"><b>${esc(title)}</b> · captured ${stamp} from the real command in <code>CAMPUS CONNECT/</code></div>
    <div class="win"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>&nbsp; ${esc(cmd)}</div>
    <pre><div class="cmd">$ ${esc(cmd)}</div>${lines}</pre></div>`;
}

const shots = [];
// Day 2: hook test cases
shots.push(['day2-hook-tests', terminal('Day 2 · Hook test cases (fire on the right event)', 'npm run test:hooks', run('node .claude/hooks/test-hooks.mjs'), ['TC1', 'TC7']) ]);
// Day 2: live hook firings recorded by Claude Code itself
// Lines tagged [live], plus the live firings logged before the [live]/[test] tag existed (timestamps taken from
// the Claude Code transcript where the hook error appeared). Plain ALLOW lines are skipped as noise.
const PRE_TAG_LIVE = ['2026-09-23T13:57:06', '2026-09-23T13:57:09', '2026-09-23T14:00:20', '2026-09-23T14:00:49', '2026-09-23T14:30:33', '2026-09-23T14:31:33'];
const live = readFileSync(join(ROOT, '.claude', 'hooks', 'hook-log.txt'), 'utf8').split(/\r?\n/)
  .filter(l => (/\[live\]/.test(l) && !/\] ALLOW (Edit|Write)/.test(l)) || PRE_TAG_LIVE.some(t => l.startsWith(t)));
shots.push(['day2-hook-live-log', terminal('Day 2 · Hooks firing live inside Claude Code (hook-log.txt, BLOCK / test runs only)', 'grep live .claude/hooks/hook-log.txt', live.join('\n'), ['BLOCK', 'FAIL'])]);
// Unit tests
shots.push(['unit-tests', terminal('Vitest · rules in src/lib', 'npm test', run('npx vitest run'), ['Tests'])]);
// E2E summary from the last real run
const e2e = JSON.parse(readFileSync(join(ROOT, 'tests', 'e2e', 'results.json'), 'utf8'));
shots.push(['day3-e2e-results', terminal(`Day 3 · End-to-end results (${e2e.passed}/${e2e.total}), run ${e2e.date}`, 'npm run test:e2e',
  e2e.results.map(r => `${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.name}`).join('\n') + `\n\n${e2e.passed}/${e2e.total} end-to-end tests passed`, ['F14', 'F17', 'F9a', 'M1', 'N4'])]);
// Git history
shots.push(['git-log', terminal('Git history', 'git log --oneline --graph --all', run('git log --oneline --graph --all --decorate'))]);

const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1180, height: 700, deviceScaleFactor: 1 });
for (const [name, html] of shots) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
  console.log('saved', `docs/screenshots/deliverables/${name}.png`);
}
await browser.close();
