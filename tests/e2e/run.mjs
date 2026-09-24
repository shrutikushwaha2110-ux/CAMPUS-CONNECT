// End-to-end tests: drive the REAL site in Chrome, one scenario per requirement, and record what actually happened.
// Run: npm run test:e2e   (builds, starts the REAL server with a fresh temporary SQLite database; uses your installed Chrome/Edge)
// Output: tests/e2e/results.json, docs/E2E_RESULTS.md, screenshots in docs/screenshots/site/
import { build } from 'vite';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOTS = join(ROOT, 'docs', 'screenshots', 'site');
mkdirSync(SHOTS, { recursive: true });
const PORT = 5190;
const BASE = `http://localhost:${PORT}/`;

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const executablePath = BROWSERS.find(p => existsSync(p));
if (!executablePath) { console.error('No Chrome/Edge found. Set CHROME_PATH.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
let page;

// ---------- helpers ----------
async function go(hash) {
  await page.evaluate(h => { location.hash = h; }, hash);
  await sleep(450);
}
async function fresh() {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => fetch('/api/test/reset', { method: 'POST' })); // re-seed the test database
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  await page.reload({ waitUntil: 'networkidle0' });
}
const apiState = () => page.evaluate(() => fetch('/api/state').then(r => r.json()));
const text = sel => page.$eval(sel, el => el.innerText).catch(() => '');
const bodyText = () => page.evaluate(() => document.body.innerText);
const hash = () => page.evaluate(() => location.hash);
async function type(sel, value) {
  await page.$eval(sel, (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, value);
}
async function click(text, scope = 'body') {
  const ok = await page.evaluate((t, s) => {
    const root = document.querySelector(s);
    const el = [...(root?.querySelectorAll('button, a') ?? [])].find(b => b.innerText.trim() === t && !b.disabled);
    if (el) { el.click(); return true; }
    return false;
  }, text, scope);
  if (!ok) throw new Error(`No enabled button/link "${text}" in ${scope}`);
  await sleep(350);
}
async function confirmDialog(label) { await click(label, '[role=dialog]'); }
async function login(slug, email, password) {
  await go(`#/logout-placeholder`);
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  await page.reload({ waitUntil: 'networkidle0' });
  await go(`#/login/${slug}`);
  await type('#email', email);
  await type('#password', password);
  // DOM click, like every other helper here: Puppeteer's synthetic mouse click was sometimes lost right after
  // page.reload() (the button was on top and a DOM click on it worked), which made logins flaky.
  await page.$eval('form button[type=submit]', b => b.click());
  await sleep(900); // scrypt password check on the server
}
// Like login(), but the test fails right here (with the page's message) if the login didn't work
async function mustLogin(slug, email, password) {
  await login(slug, email, password);
  const h = await hash();
  if (h.startsWith('#/login')) throw new Error(`login as ${email} failed: "${await text('[role=alert]')}" (hash ${h})`);
}
const asStudent = (email = 'shruti@atria.edu.in') => mustLogin('student', email, 'demo123');
const asManager = (club = 'dance') => mustLogin('club-manager', `${club}.manager@atria.edu.in`, 'demo123');
const asFaculty = () => mustLogin('faculty', 'admin@atria.edu.in', 'admin123'); // Dr. Farah Khan, head of Dance Club
const asMusicHead = () => mustLogin('faculty', 'meera.nair@atria.edu.in', 'admin123'); // Prof. Meera Nair, head of Music Club
const navLinks = () => page.$$eval('nav[aria-label=Main] a', as => as.map(a => a.innerText.trim()).filter(t => t && t !== 'CampusConnect' && t !== 'Log in'));
const rowIds = () => page.$$eval('[data-event-row]', els => els.map(e => e.dataset.eventRow));
const cardIds = () => page.$$eval('[data-event-card]', els => els.map(e => e.dataset.eventCard));
async function shot(name, { fullPage = true, width } = {}) {
  if (width) await page.setViewport({ width, height: 812, deviceScaleFactor: 1 });
  await sleep(300);
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage });
  if (width) await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1 });
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

async function test(id, name, input, expected, fn) {
  const t0 = Date.now();
  try {
    const actual = await fn();
    results.push({ id, name, input, expected, actual, pass: true, ms: Date.now() - t0 });
    console.log(`PASS  ${id}  ${name}`);
  } catch (e) {
    results.push({ id, name, input, expected, actual: `FAILED: ${e.message}`, pass: false, ms: Date.now() - t0 });
    console.log(`FAIL  ${id}  ${name}\n      ${e.message}`);
    await page.screenshot({ path: join(SHOTS, `FAIL-${id}.png`), fullPage: true }).catch(() => {});
  }
}

// ---------- run ----------
// Test the production build (what gets deployed). The dev server force-reloads the page when it
// discovers new dependencies mid-test, which wiped half-typed forms and made logins flaky.
console.log('Building production bundle…');
await build({ root: ROOT, logLevel: 'error' });
// The real production server (API + dist/) with a throw-away database; CC_TEST_RESET enables /api/test/reset
const DB_PATH = join(tmpdir(), `campusconnect-e2e-${Date.now()}.db`);
const server = spawn(process.execPath, [join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), join(ROOT, 'server', 'index.ts')], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT), DB_PATH, CC_TEST_RESET: '1', NODE_NO_WARNINGS: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server did not start')), 30000);
  server.stdout.on('data', d => { if (String(d).includes('running on')) { clearTimeout(t); resolve(); } });
  server.stderr.on('data', d => process.stderr.write(d));
});
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));

try {
  await fresh();
  await shot('01-home-desktop', { fullPage: false });

  // ---------- logins ----------
  await test('A1', 'Separate login page per role', 'Open /login', 'Three role login cards: Student, Club Manager, Faculty/Admin', async () => {
    await go('#/login');
    const roles = await page.$$eval('[data-role]', els => els.map(e => e.dataset.role));
    expect(roles.join() === 'student,clubManager,faculty', `roles: ${roles}`);
    await shot('02-login-chooser');
    return `Cards: ${roles.join(', ')}`;
  });

  await test('A1', 'Wrong password is rejected', 'student login, password "wrong"', 'Error, stays on login page', async () => {
    await login('student', 'shruti@atria.edu.in', 'wrong');
    const err = await text('[role=alert]');
    expect(/incorrect/i.test(err) && (await hash()).includes('/login/student'), `err="${err}" hash=${await hash()}`);
    return `"${err}"`;
  });

  await test('A1', 'Student account cannot use the Faculty login', 'shruti@student… on /login/faculty', 'Error: use the login page for your role', async () => {
    await login('faculty', 'shruti@atria.edu.in', 'demo123');
    const err = await text('[role=alert]');
    expect(/not a Faculty/i.test(err), err);
    return `"${err}"`;
  });

  await test('A1', 'Each role lands on its own dashboard', 'Log in as student, Dance manager, admin', '/dashboard, /manage, /faculty', async () => {
    await asStudent(); const s = await hash();
    await asManager('dance'); const m = await hash();
    await asFaculty(); const f = await hash();
    expect(s === '#/dashboard' && m === '#/manage' && f === '#/faculty', `${s} ${m} ${f}`);
    return `${s}, ${m}, ${f}`;
  });

  await test('A1', 'Session survives refresh and role is visible', 'Dance manager, reload', 'Navbar pill shows "Priya Sharma · Club Manager · Dance Club"', async () => {
    await asManager('dance');
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(400);
    const pill = await text('[data-testid=role-pill]');
    expect(pill.includes('Club Manager') && pill.includes('Dance Club'), pill);
    return pill;
  });

  await test('R17', 'Logged-out visitor is sent to login for a dashboard', 'Log out, open /dashboard', 'Redirect to /login/student?next=…', async () => {
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
    await page.reload({ waitUntil: 'networkidle0' });
    await go('#/dashboard');
    const h = await hash();
    expect(h.startsWith('#/login/student'), h);
    return h;
  });

  // ---------- database: sign up, log in later ----------
  await fresh();
  await test('SU1', 'Sign up as a new student, log out, log in again', 'Sign up "Neha Rao" neha@atria.edu.in / campus2026; log out; log in on /login/student', 'Lands on dashboard after sign-up and again after the later login', async () => {
    await go('#/login/student');
    await click('Sign up');
    await type('#su-name', 'Neha Rao'); await type('#su-email', 'neha@atria.edu.in');
    await type('#su-password', 'campus2026'); await type('#su-confirm', 'campus2026');
    await shot('18-signup-form');
    await page.$eval('[data-testid=signup-form] button[type=submit]', b => b.click()); await sleep(1200);
    const afterSignup = `${await hash()} "${await text('main h1')}"`;
    expect(afterSignup.startsWith('#/dashboard') && afterSignup.includes('Hi, Neha'), afterSignup);
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
    await page.reload({ waitUntil: 'networkidle0' });
    await mustLogin('student', 'neha@atria.edu.in', 'campus2026');
    const afterLogin = `${await hash()} "${await text('main h1')}"`;
    expect(afterLogin.startsWith('#/dashboard') && afterLogin.includes('Hi, Neha'), afterLogin);
    return `After sign-up: ${afterSignup}; after logging out and back in: ${afterLogin}`;
  });

  await test('SU1', 'Sign-up form rejects bad input', 'Existing email, short password, mismatched confirm, a @gmail.com address', 'Field errors (incl. "must end with @atria.edu.in"), no account created', async () => {
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
    await go('#/signup');
    await type('#su-name', 'Copy Cat'); await type('#su-email', 'shruti@atria.edu.in');
    await type('#su-password', 'abc'); await type('#su-confirm', 'abd');
    await page.$eval('[data-testid=signup-form] button[type=submit]', b => b.click()); await sleep(400);
    const local = await page.$$eval('[data-error]', els => els.map(e => `${e.dataset.error}: ${e.innerText}`));
    await type('#su-email', 'copy.cat@gmail.com'); await type('#su-password', 'campus2026'); await type('#su-confirm', 'campus2026');
    await page.$eval('[data-testid=signup-form] button[type=submit]', b => b.click()); await sleep(400);
    const domain = await text('[data-error="su-email"]');
    expect(/@atria\.edu\.in/.test(domain), `domain error: ${domain}`);
    await type('#su-email', 'shruti@atria.edu.in');
    await page.$eval('[data-testid=signup-form] button[type=submit]', b => b.click()); await sleep(1000);
    const server = await text('[data-error="su-email"]');
    expect(local.some(e => e.startsWith('su-password')) && local.some(e => e.startsWith('su-confirm')) && /already exists/.test(server), `${local} | ${server}`);
    return `Browser check: ${local.join('; ')} · gmail address: "${domain}" · Server check: "${server}"`;
  });

  await test('SU2', 'Club Manager sign-up waits for the faculty head’s approval', 'Sign up "Kabir" as Dance Club manager; try to log in; Dance head approves in Users; log in again', 'Pending message, login refused, then works after approval', async () => {
    await go('#/signup');
    await page.evaluate(() => [...document.querySelectorAll('[data-testid=signup-form] label')].find(l => l.innerText.trim() === 'Club Manager').click());
    await sleep(200);
    await type('#su-name', 'Kabir Sen'); await type('#su-email', 'kabir@atria.edu.in');
    await type('#su-club', 'dance-club'); await type('#su-password', 'campus2026'); await type('#su-confirm', 'campus2026');
    await page.$eval('[data-testid=signup-form] button[type=submit]', b => b.click()); await sleep(1200);
    const pendingPage = await text('[data-testid=signup-pending]');
    await login('club-manager', 'kabir@atria.edu.in', 'campus2026');
    const refused = await text('[role=alert]');
    await asMusicHead();
    await go('#/faculty/users');
    const musicSees = await page.$$eval('[data-pending="kabir@atria.edu.in"] button', bs => bs.map(b => b.innerText));
    await asFaculty();
    await go('#/faculty/users');
    await shot('19-faculty-signup-requests');
    await page.evaluate(() => [...document.querySelectorAll('[data-pending="kabir@atria.edu.in"] button')].find(b => b.innerText === 'Approve').click());
    await sleep(800);
    await mustLogin('club-manager', 'kabir@atria.edu.in', 'campus2026');
    const title = await text('main h1');
    expect(/waiting for approval/.test(pendingPage) && /waiting for approval/.test(refused) && musicSees.length === 0 && title === 'Dance Club', `${pendingPage} | ${refused} | music=${musicSees} | ${title}`);
    return `"Request sent … waiting for approval"; login refused ("${refused}"); Music head sees no Approve button; Dance head approved → Kabir lands on "${title}"`;
  });

  await test('SU4', 'Passwords never reach the browser', 'Faculty loads /api/state (all users)', 'No password or hash in the response', async () => {
    const st = JSON.stringify(await apiState());
    expect(st.includes('kabir@atria.edu.in') && !/scrypt|password|campus2026|demo123/.test(st), 'secret found in state');
    return `State has ${JSON.parse(st).users.length} users, no password fields or hashes`;
  });

  // ---------- student ----------
  await fresh();
  await test('S1', 'Student sees all events and all clubs', 'Student opens /events and /clubs', '13 upcoming events, 6 clubs, both rule messages shown', async () => {
    await asStudent();
    await go('#/events');
    const events = await page.$$eval('main h3', els => els.length);
    await go('#/clubs');
    const clubs = await page.$$eval('[data-club]', els => els.length);
    const rules = await text('[data-testid=student-rules]');
    expect(events === 13 && clubs === 6, `events=${events} clubs=${clubs}`);
    expect(rules.includes('You can join a maximum of 2 clubs.') && rules.includes('You can attend/register for events from any club.'), rules);
    return `${events} events, ${clubs} clubs; rules: "You can join a maximum of 2 clubs." + "You can attend/register for events from any club."`;
  });

  await test('F5a', 'Register for another club’s event without being a member', 'Shruti (no clubs) registers for Open Mic Evening (Music Club)', 'Registered; dashboard shows Confirmed', async () => {
    await go('#/events/open-mic-evening');
    await click('Register');
    const card = await text('[data-testid=registration-card]');
    expect(card.includes('Confirmed') && card.includes('Registered'), card);
    await go('#/dashboard');
    const regs = await text('[data-testid=my-registrations]');
    expect(regs.includes('Open Mic Evening') && regs.includes('Confirmed'), regs);
    return 'Card: "Your registration: Confirmed / Registered"; dashboard lists Open Mic Evening · Confirmed';
  });

  await test('F9a', 'Join max 2 clubs', 'Join Dance Club, Music Club, then try Sports Club', 'Third join blocked: "Limit reached", counter 2/2', async () => {
    await go('#/clubs');
    await page.$eval('[data-club="dance-club"] button', b => b.click()); await sleep(250);
    await page.$eval('[data-club="music-club"] button', b => b.click()); await sleep(250);
    const sportsBtn = await page.$eval('[data-club="sports-club"] button', b => ({ t: b.innerText.trim(), d: b.disabled }));
    const rules = await text('[data-testid=student-rules]');
    expect(sportsBtn.t === 'Limit reached' && sportsBtn.d, JSON.stringify(sportsBtn));
    expect(rules.includes("joined 2 of 2"), rules);
    const stored = (await apiState()).memberships.length;
    expect(stored === 2, `stored memberships ${stored}`);
    await shot('03-student-clubs-limit');
    return `Sports Club button "${sportsBtn.t}" (disabled); banner "You've joined 2 of 2"; 2 memberships stored`;
  });

  await test('F9a', 'Still able to register for a non-member club’s event at the limit', 'With 2 clubs, register for Football Cup (Sports Club)', 'Registration succeeds', async () => {
    await go('#/events/football-cup');
    await click('Register');
    const card = await text('[data-testid=registration-card]');
    expect(card.includes('Confirmed'), card);
    return 'Confirmed';
  });

  await test('F9', 'Leave a club frees a slot', 'Leave Music Club (confirm), then Sports Club button', 'Sports "Join" enabled again', async () => {
    await go('#/clubs');
    await page.$eval('[data-club="music-club"] button', b => b.click()); await sleep(250);
    await confirmDialog('Leave club');
    const t = await page.$eval('[data-club="sports-club"] button', b => b.innerText.trim() + (b.disabled ? ' (disabled)' : ''));
    expect(t === 'Join', t);
    // re-join Music so later scenarios have a Music member
    await page.$eval('[data-club="music-club"] button', b => b.click()); await sleep(250);
    return `Sports button: "${t}"`;
  });

  await test('F10', 'Student dashboard shows everything', 'Open /dashboard', 'Registrations, clubs 2/2, announcements, suggestions', async () => {
    await go('#/dashboard');
    const t = await bodyText();
    expect(t.includes('My clubs (2/2)') && t.includes('Upcoming events for you') && t.includes('Announcements'), 'sections missing');
    const ann = await text('[data-testid=my-announcements]');
    expect(ann.includes('Welcome to CampusConnect') && ann.includes('Annual Dance Fest auditions'), ann);
    await shot('04-student-dashboard');
    return 'Sections: registrations, upcoming for you, My clubs (2/2), announcements (university + Dance + Music), following';
  });

  // ---------- approval flow ----------
  await test('M3', 'Registration needing approval starts Pending', 'Shruti requests Battle of Bands (requiresApproval)', 'Status "Pending approval"', async () => {
    await go('#/events/battle-of-bands');
    await click('Request to register');
    const card = await text('[data-testid=registration-card]');
    expect(card.includes('Pending approval'), card);
    return 'Pending approval';
  });

  await test('M3', 'Club Manager accepts a registration', 'Music manager → Battle of Bands registrations → Accept', 'Student then sees Confirmed', async () => {
    await asManager('music');
    await go('#/manage/events/battle-of-bands/registrations');
    const before = await text('[data-testid=registrations-list]');
    expect(before.includes('Shruti Kushwaha') && before.includes('Pending'), before);
    await shot('05-manager-registrations-pending');
    await click('Accept');
    const after = await text('[data-testid=registrations-list]');
    expect(after.includes('Confirmed'), after);
    await asStudent();
    await go('#/dashboard');
    const regs = await text('[data-testid=my-registrations]');
    expect(/Battle of Bands[\s\S]*Confirmed/.test(regs), regs);
    return 'Manager saw "Shruti Kushwaha · Pending approval", clicked Accept → Confirmed; student dashboard shows Battle of Bands · Confirmed';
  });

  await test('M3', 'Club Manager rejects a registration and the seat is freed', 'Raju registers Open Mic; Music manager rejects', 'Raju sees Rejected; seats filled goes back down', async () => {
    await asStudent('raju@atria.edu.in');
    await go('#/events/open-mic-evening'); await click('Register');
    await asManager('music');
    await go('#/manage/events/open-mic-evening/registrations');
    const before = await page.$eval('[data-seats-filled]', e => e.dataset.seatsFilled);
    await page.evaluate(() => [...document.querySelectorAll('[data-student="stu-raju"] button')].find(b => b.innerText === 'Reject').click());
    await sleep(350);
    const after = await page.$eval('[data-seats-filled]', e => e.dataset.seatsFilled);
    await asStudent('raju@atria.edu.in');
    await go('#/events/open-mic-evening');
    const card = await text('[data-testid=registration-card]');
    expect(card.includes('Rejected') && before !== after, `${before} → ${after}; ${card}`);
    return `Seats filled ${before} → ${after}; Raju sees "Rejected"`;
  });

  // ---------- club manager scope ----------
  await test('M1', 'Club Manager sees only their own club', 'Dance manager opens /manage', 'Only Dance Club events, members, announcements', async () => {
    await asManager('dance');
    await go('#/manage');
    const rows = await page.$$eval('[data-event-row]', els => els.map(e => e.dataset.eventRow));
    const club = await page.$eval('[data-testid=club-admin]', e => e.dataset.club);
    expect(club === 'dance-club' && rows.every(r => ['annual-dance-fest', 'dance-workshop'].includes(r)), `${club} ${rows}`);
    const members = await text('[data-testid=club-members]');
    expect(members.includes('Shruti Kushwaha'), members);
    await shot('06-manager-dashboard');
    return `club=${club}; events=${rows.join(', ')}; members list includes Shruti Kushwaha`;
  });

  await test('M1', 'Club Manager blocked from another club’s management data', 'Dance manager types Music URLs + /faculty', 'All three show "Not available"', async () => {
    const blocked = [];
    for (const h of ['#/manage/events/open-mic-evening/registrations', '#/manage/events/battle-of-bands/edit', '#/faculty/clubs']) {
      await go(h);
      blocked.push(!!(await page.$('[data-testid=not-allowed]')));
    }
    expect(blocked.every(Boolean), JSON.stringify(blocked));
    await go('#/manage/events/open-mic-evening/registrations');
    await shot('07-manager-blocked-other-club', { fullPage: false });
    return 'Music registrations, Music edit URL and /faculty/clubs all blocked';
  });

  await test('M6', 'Club Manager sees only "Manage club" and "Events"', 'Log in as Music Club manager; check navbar, /, /clubs, /units, /events, a Dance event URL', 'Nav = Manage club + Events; other pages redirect to /manage; Events = student-style page with only Music events + Music announcements', async () => {
    await asManager('music');
    const nav = await navLinks();
    expect(nav.join('|') === 'Manage club|Events', `nav: ${nav}`);
    const footer = await page.$$eval('footer a', as => as.map(a => a.innerText.trim()).filter(t => t && t !== 'CampusConnect'));
    expect(footer.join('|') === 'Manage club|Events', `footer: ${footer}`);
    const manage = await bodyText();
    expect(['+ New event', '+ Announcement', 'Members', 'Upcoming events'].every(x => manage.includes(x)), 'manage club section incomplete');
    await shot('14-music-manager-manage-club');
    const redirects = [];
    for (const h of ['#/', '#/clubs', '#/units']) { await go(h); redirects.push(`${h}→${await hash()}`); }
    expect(redirects.every(r => r.endsWith('#/manage')), redirects.join(', '));
    await go('#/events');
    const title = await text('main h1');
    const scope = await text('[data-testid=staff-events-scope]');
    const rows = await cardIds();
    const sameUi = !!(await page.$('input[aria-label]')) && !!(await page.$('select[aria-label="Filter by date"]')) && (await page.$$('main button')).length >= 7;
    const ann = await text('[data-testid=announcements-list]');
    expect(title === 'Events' && scope.includes('Music Club') && sameUi && rows.length > 0 && rows.every(r => ['open-mic-evening', 'battle-of-bands'].includes(r)), `${title} | ${scope} | sameUi=${sameUi} | ${rows}`);
    expect(ann.includes('Weekly jam night') && !ann.includes('Annual Dance Fest auditions') && !ann.includes('Welcome to CampusConnect'), ann);
    await shot('15-music-manager-events');
    await go('#/events/annual-dance-fest');
    const blocked = !!(await page.$('[data-testid=not-allowed]'));
    expect(blocked, 'Dance event page was visible to the Music manager');
    return `Nav: "${nav.join('" + "')}"; ${redirects.join(', ')}; Events page = student UI (search, category chips, date filter, cards) titled "${title}", scoped "${scope.split('.')[0]}"; cards=${rows.join(', ')}; announcements = Music only; Dance event URL blocked`;
  });

  await test('O2', 'Invalid event form creates nothing', 'Dance manager: seats 0 + past date', 'Errors shown, event not created', async () => {
    await asManager('dance');
    await go('#/manage/events/new');
    await type('#title', 'Bad Event'); await type('#category', 'Workshop'); await type('#date', '2020-01-01');
    await type('#time', '18:00'); await type('#venue', 'Studio A'); await type('#description', 'x'); await type('#seats', '0');
    await page.$eval('[data-testid=event-form] button[type=submit]', b => b.click()); await sleep(300);
    const errs = await page.$$eval('[data-error]', els => els.map(e => `${e.dataset.error}: ${e.innerText}`));
    const stored = JSON.stringify((await apiState()).events.map(e => e.title));
    expect(errs.some(e => e.startsWith('date')) && errs.some(e => e.startsWith('seats')) && !stored.includes('Bad Event'), errs.join('; '));
    await shot('08-event-form-errors');
    return errs.join('; ');
  });

  await test('O1', 'Club Manager creates an event', 'Dance manager: "Salsa Social Night", valid data', 'Appears on /events hosted by Dance Club', async () => {
    await go('#/manage/events/new');
    await type('#title', 'Salsa Social Night'); await type('#category', 'Cultural & Social'); await type('#date', '2026-12-20');
    await type('#time', '18:30'); await type('#venue', 'Studio A'); await type('#description', 'Beginner-friendly salsa social.'); await type('#seats', '40');
    const host = await page.$eval('#host', s => s.options[s.selectedIndex].text + (s.disabled ? ' (locked)' : ''));
    await page.$eval('[data-testid=event-form] button[type=submit]', b => b.click()); await sleep(500);
    const staffList = await text('[data-testid=staff-events]');
    await asStudent('sohail@atria.edu.in');
    await go('#/events?q=salsa');
    const t = await bodyText();
    expect(staffList.includes('Salsa Social Night') && t.includes('Salsa Social Night') && t.includes('by Dance Club'), 'not listed');
    return `Host field: "${host}"; listed in the manager's Events section and on the student /events page "by Dance Club"`;
  });

  await test('M5', 'Club Manager posts an announcement; members see it', 'Dance manager posts "Costume fitting"', 'Shown in the manager\'s Events section; Shruti (Dance member) sees it on her dashboard', async () => {
    await asManager('dance');
    await go('#/manage/announcements/new');
    const scope = await page.$eval('#scope', s => s.options[s.selectedIndex].text + (s.disabled ? ' (locked)' : ''));
    await type('#ann-title', 'Costume fitting'); await type('#ann-body', 'Fitting for Dance Fest on Saturday, 3 pm.');
    await page.$eval('[data-testid=announcement-form] button[type=submit]', b => b.click()); await sleep(400);
    const inEvents = (await text('[data-testid=announcements-list]')).includes('Costume fitting');
    expect(inEvents && (await hash()) === '#/events', 'not in the Events section');
    await asStudent();
    await go('#/dashboard');
    const ann = await text('[data-testid=my-announcements]');
    expect(ann.includes('Costume fitting'), ann);
    return `Audience "${scope}"; student dashboard shows "Costume fitting"`;
  });

  // ---------- F14: cancelled event on the dashboard ----------
  await test('F14', 'Cancelled event shows on the student dashboard', 'Shruti registers Annual Dance Fest; Dance manager cancels it (confirm)', 'Dashboard: "Cancelled by organiser"; event page blocks registering', async () => {
    await go('#/events/annual-dance-fest'); await click('Register');
    await asManager('dance');
    await go('#/manage');
    await page.evaluate(() => [...document.querySelectorAll('[data-event-row="annual-dance-fest"] button')].find(b => b.innerText === 'Cancel').click());
    await sleep(250);
    await confirmDialog('Cancel event');
    await asStudent();
    await go('#/dashboard');
    const row = await text('[data-event="annual-dance-fest"]');
    expect(row.includes('Cancelled by organiser'), row);
    await shot('09-student-dashboard-cancelled-event');
    await asStudent('ananya@atria.edu.in');
    await go('#/events/annual-dance-fest');
    const card = await text('[data-testid=registration-card]');
    expect(card.includes('Cancelled') && !(await bodyText()).includes('Request to register'), card);
    return 'Dashboard row: "Annual Dance Fest … Cancelled by organiser"; other student sees "Cancelled" (disabled)';
  });

  // ---------- faculty ----------
  await test('FA1', 'Faculty/Admin dashboard', 'Admin opens /faculty', 'Stats + links to Clubs, Events, Users, Announcements', async () => {
    await asFaculty();
    const t = await bodyText();
    expect(['Clubs →', 'Events →', 'Users →', 'Announcements →'].every(x => t.includes(x)), 'links missing');
    await shot('10-faculty-dashboard');
    return 'Stats tiles + 4 management areas shown';
  });

  await test('O3f', 'Faculty head manages own club + university events only', 'Dr. Farah Khan (head of Dance): Events page; edit Dance Workshop; open Maker Tools (unit) and Open Mic (Music) edit URLs', 'Own + unit events only; Music edit blocked', async () => {
    const nav = await navLinks();
    expect(!nav.includes('Units'), `nav still has Units: ${nav}`);
    await go('#/events');
    const rows = await cardIds();
    const other = ['open-mic-evening', 'battle-of-bands', 'football-cup', 'twenty-four-hour-hackathon', 'robotics-expo', 'literature-circle', 'esports-night'];
    expect(rows.length > 0 && !rows.some(r => other.includes(r)) && rows.includes('maker-tools-workshop'), `rows: ${rows}`);
    await shot('16-faculty-events');
    await go('#/manage/events/dance-workshop/edit');
    await type('#venue', 'Studio B');
    await page.$eval('[data-testid=event-form] button[type=submit]', b => b.click()); await sleep(400);
    await go('#/manage/events/maker-tools-workshop/edit');
    const unitEditable = !!(await page.$('#venue'));
    await go('#/manage/events/open-mic-evening/edit');
    const musicBlocked = !!(await page.$('[data-testid=not-allowed]'));
    await asStudent('sohail@atria.edu.in');
    await go('#/events/dance-workshop');
    const updated = (await bodyText()).includes('Studio B');
    expect(unitEditable && musicBlocked && updated, `unit=${unitEditable} musicBlocked=${musicBlocked} updated=${updated}`);
    await asFaculty();
    return `Navbar: ${nav.join(', ')}; Events rows: ${rows.join(', ')}; Dance Workshop venue → Studio B (student sees it); unit event editable; Music event edit blocked`;
  });

  await test('C2', 'Duplicate club name is rejected', 'Admin adds club named "dance club"', 'Error, nothing created', async () => {
    await go('#/faculty/clubs/new');
    await type('#club-name', 'dance club'); await type('#club-category', 'Arts & Culture');
    await type('#club-description', 'dup'); await type('#club-manager', 'X');
    await page.$eval('[data-testid=club-form] button[type=submit]', b => b.click()); await sleep(300);
    const err = await text('[data-error="club-name"]');
    expect(/already exists/.test(err), err);
    return `"${err}"`;
  });

  await test('C1', 'Faculty/Admin adds a club', 'Add "Photography Club"', 'Listed on /clubs', async () => {
    await go('#/faculty/clubs/new');
    await type('#club-name', 'Photography Club'); await type('#club-category', 'Arts & Culture');
    await type('#club-description', 'Photo walks and editing workshops.'); await type('#club-manager', 'Asha K');
    await page.$eval('[data-testid=club-form] button[type=submit]', b => b.click()); await sleep(400);
    await go('#/clubs');
    expect((await bodyText()).includes('Photography Club'), 'not listed');
    return 'Photography Club shown on /clubs';
  });

  await test('C3', 'Faculty/Admin edits club info', 'Change Dance Club description', 'New description on /clubs', async () => {
    await go('#/faculty/clubs/dance-club/edit');
    await type('#club-description', 'Every style of dance, every week.');
    await page.$eval('[data-testid=club-form] button[type=submit]', b => b.click()); await sleep(400);
    await go('#/clubs');
    expect((await bodyText()).includes('Every style of dance, every week.'), 'not updated');
    await go('#/faculty/clubs/music-club/edit');
    const musicBlocked = !!(await page.$('[data-testid=not-allowed]'));
    await go('#/faculty/clubs');
    const mine = await page.$$eval('[data-club-row]', els => els.map(e => e.dataset.clubRow));
    expect(musicBlocked && mine.join() === 'dance-club', `musicBlocked=${musicBlocked} myClub=${mine}`);
    await shot('17-faculty-my-club');
    return 'Dance description updated; Music Club edit URL blocked; "My club" lists only Dance Club';
  });

  await test('U1', 'Faculty assigns accounts only within their scope', 'Dance head: Add user → Club Manager, then → Faculty; create faculty head "Asha K" for Photography Club', 'Managers: only Dance Club offered; faculty head: only clubs without a head; Asha manages Photography', async () => {
    await go('#/faculty/users');
    await click('+ Add user');
    await type('#u-role', 'clubManager'); await sleep(200);
    const mgrClubs = await page.$$eval('#u-club option', os => os.map(o => o.text).filter(t => !t.startsWith('Select') && !t.startsWith('No club')));
    await type('#u-role', 'faculty'); await sleep(200);
    const headClubs = await page.$$eval('#u-club option', os => os.map(o => o.text).filter(t => !t.startsWith('Select') && !t.startsWith('No club')));
    expect(mgrClubs.join() === 'Dance Club' && headClubs.join() === 'Photography Club', `mgr=${mgrClubs} head=${headClubs}`);
    await type('#u-name', 'Asha K'); await type('#u-email', 'photo.head@atria.edu.in');
    const clubId = await page.$eval('#u-club', s => [...s.options].find(o => o.text === 'Photography Club').value);
    await type('#u-club', clubId); await type('#u-password', 'photo123');
    await page.$eval('[data-testid=user-form] button[type=submit]', b => b.click()); await sleep(400);
    await mustLogin('faculty', 'photo.head@atria.edu.in', 'photo123');
    await go('#/faculty/clubs');
    const mine = await page.$$eval('[data-club-row]', els => els.map(e => e.dataset.clubRow));
    expect(mine.length === 1 && mine[0].startsWith('photography-club'), `${mine}`);
    return `Club Manager → clubs offered: ${mgrClubs.join(', ')}; Faculty head → clubs offered: ${headClubs.join(', ')}; Asha logged in, "My club" = Photography Club`;
  });

  await test('U2', 'Deactivated user cannot log in', 'Admin deactivates Raju; Raju tries to log in', 'Error: account deactivated', async () => {
    await asFaculty();
    await go('#/faculty/users');
    await page.evaluate(() => [...document.querySelectorAll('[data-user="stu-raju"] button')].find(b => b.innerText === 'Deactivate').click());
    await sleep(250);
    await confirmDialog('Deactivate');
    await login('student', 'raju@atria.edu.in', 'demo123');
    const err = await text('[role=alert]');
    expect(/deactivated/i.test(err), err);
    return `"${err}"`;
  });

  await test('U3', 'Faculty cannot edit or deactivate another faculty member', 'Dance head opens Users', 'Other faculty + other clubs\' managers show no Edit/Deactivate; own club manager and students do', async () => {
    await asFaculty();
    await go('#/faculty/users');
    const buttons = id => page.$$eval(`[data-user="${id}"] button`, bs => bs.map(b => b.innerText.trim()));
    const vikram = await buttons('fac-vikram');
    const meera = await buttons('fac-music');
    const musicMgr = await buttons('mgr-music');
    const danceMgr = await buttons('mgr-dance');
    const student = await buttons('stu-sohail');
    const protectedText = await text('[data-user="fac-vikram"] [data-protected]');
    expect(vikram.length === 0 && meera.length === 0 && musicMgr.length === 0, `faculty/other buttons: ${vikram} ${meera} ${musicMgr}`);
    expect(danceMgr.includes('Deactivate') && student.includes('Deactivate'), `dance=${danceMgr} student=${student}`);
    await shot('11-faculty-users');
    return `Dr. Vikram Shah: no buttons ("${protectedText}"); Prof. Meera Nair: none; Music manager: none; Dance manager: ${danceMgr.join('/')}; student: ${student.join('/')}`;
  });

  // ---------- F17: deleted club disappears ----------
  await test('F17', 'Deleted club disappears everywhere', 'Music head (Prof. Meera Nair) deletes Music Club (Shruti is a member)', 'Gone from /clubs and Shruti’s dashboard; its events cancelled; its manager and head can’t log in', async () => {
    await asMusicHead();
    await go('#/faculty/clubs');
    await page.evaluate(() => [...document.querySelectorAll('[data-club-row="music-club"] button')].find(b => b.innerText === 'Delete').click());
    await sleep(250);
    const msg = await text('[role=dialog]');
    await confirmDialog('Delete club');
    await go('#/clubs');
    // check the club cards, not body text: the "Music Club deleted" toast is still on screen here
    const onClubs = !!(await page.$('[data-club="music-club"]'));
    await asStudent();
    await go('#/dashboard');
    const myClubs = await text('[data-testid=my-clubs]');
    await go('#/events/battle-of-bands');
    const bandsCancelled = (await bodyText()).includes('This event was cancelled.');
    await shot('12-student-dashboard-after-club-deleted');
    await login('club-manager', 'music.manager@atria.edu.in', 'demo123');
    const mgrErr = await text('[role=alert]');
    await login('faculty', 'meera.nair@atria.edu.in', 'admin123');
    const headErr = await text('[role=alert]');
    expect(!onClubs && !myClubs.includes('Music Club') && bandsCancelled && /not assigned to an active club/.test(mgrErr) && /not assigned to an active club/.test(headErr),
      `onClubs=${onClubs} myClubs="${myClubs}" cancelled=${bandsCancelled} mgr="${mgrErr}" head="${headErr}"`);
    const warned = msg.match(/(\d+)\s*upcoming/)?.[1] ?? '?';
    return `Dialog warned ${warned} upcoming event(s); not on /clubs; Shruti's My clubs = Dance only; Battle of Bands cancelled; Music manager AND Music head logins refused`;
  });

  // ---------- whole site ----------
  await test('N4', 'Reduced motion stops the 3D animation', 'Emulate prefers-reduced-motion: reduce, open Home, wait 1.5 s', 'data-motion=reduced and exactly 1 frame drawn', async () => {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await fresh();
    await sleep(1500);
    const reduced = await page.evaluate(() => { const el = document.querySelector('[data-motion]'); return el && { motion: el.dataset.motion, frames: Number(el.dataset.frames) }; });
    await sleep(1000);
    const reducedLater = await page.evaluate(() => Number(document.querySelector('[data-motion]').dataset.frames));
    // flip the OS setting back while the page is open: animation must resume without reload
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await sleep(1000);
    const full = await page.evaluate(() => { const el = document.querySelector('[data-motion]'); return { motion: el.dataset.motion, frames: Number(el.dataset.frames) }; });
    expect(reduced?.motion === 'reduced' && reduced.frames === 1 && reducedLater === 1, JSON.stringify(reduced));
    expect(full.motion === 'full' && full.frames > 10, JSON.stringify(full));
    return `reduce → motion=${reduced.motion}, frames=${reduced.frames} (still ${reducedLater} after 1 s); switched back → motion=${full.motion}, frames=${full.frames}`;
  });

  await test('N4', 'Site works without WebGL', 'Block WebGL, open Home', 'No canvas, hero/search/featured still render, no errors', async () => {
    await page.evaluateOnNewDocument(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : orig.call(this, t, ...a); };
    });
    const before = pageErrors.length;
    await fresh(); await sleep(1200);
    const canvases = await page.$$eval('canvas', c => c.length);
    const t = await bodyText();
    expect(canvases === 0 && t.includes("Find what's happening at Atria") && t.includes('Annual Dance Fest') && pageErrors.length === before, `canvas=${canvases} errors=${pageErrors.slice(before)}`);
    return `${canvases} canvases; hero, search and featured event rendered; 0 page errors`;
  });

  await test('N1', 'Phone width (375 px), every role', '375×812 on public, student, manager, faculty pages', 'No sideways scroll anywhere', async () => {
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const bad = [];
    const check = async h => { await go(h); await sleep(250); const w = await page.evaluate(() => document.documentElement.scrollWidth); if (w > 375) bad.push(`${h}=${w}`); };
    for (const h of ['#/', '#/events', '#/events/annual-dance-fest', '#/clubs', '#/units', '#/login', '#/login/student', '#/signup', '#/nope']) await check(h);
    await asStudent(); await check('#/dashboard');
    await shot('13-mobile-student-dashboard', { width: 375 });
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await asManager('dance'); for (const h of ['#/manage', '#/events', '#/manage/events/new', '#/manage/events/dance-workshop/registrations']) await check(h);
    await asFaculty(); for (const h of ['#/faculty', '#/faculty/clubs', '#/events', '#/faculty/users', '#/faculty/announcements']) await check(h);
    await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1 });
    expect(bad.length === 0, bad.join(', '));
    return '19 routes checked at 375 px, all scrollWidth ≤ 375';
  });

  await test('N2', 'Footer notice on every page', 'Visit main routes', '"Unofficial student project" everywhere', async () => {
    const missing = [];
    for (const h of ['#/', '#/events', '#/clubs', '#/units', '#/faculty', '#/faculty/users', '#/login']) {
      await go(h);
      if (!(await bodyText()).includes('Unofficial student project')) missing.push(h);
    }
    expect(missing.length === 0, missing.join(', '));
    return 'Present on all 7';
  });

  await test('—', 'No uncaught page errors during the whole run', 'All scenarios above', '0 errors', async () => {
    expect(pageErrors.length === 0, pageErrors.join(' | '));
    return '0 uncaught errors';
  });
} finally {
  await browser.close();
  server.kill();
  await sleep(300);
  rmSync(DB_PATH, { force: true });
}

// ---------- report ----------
const passed = results.filter(r => r.pass).length;
const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
mkdirSync(join(ROOT, 'tests', 'e2e'), { recursive: true });
writeFileSync(join(ROOT, 'tests', 'e2e', 'results.json'), JSON.stringify({ date, browser: executablePath, passed, total: results.length, results }, null, 2));
const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
writeFileSync(join(ROOT, 'docs', 'E2E_RESULTS.md'), `# End-to-end test results

Generated by \`npm run test:e2e\` (tests/e2e/run.mjs) on **${date}** in headless Chrome against the real site.
**${passed} / ${results.length} passed.** Screenshots: \`docs/screenshots/site/\`.

| ID | Test | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
${results.map(r => `| ${r.id} | ${esc(r.name)} | ${esc(r.input)} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.pass ? '✅ Pass' : '❌ Fail'} |`).join('\n')}
`);
console.log(`\n${passed}/${results.length} end-to-end tests passed`);
process.exit(passed === results.length ? 0 : 1);
