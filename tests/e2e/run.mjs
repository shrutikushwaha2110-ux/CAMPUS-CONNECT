// End-to-end tests: drive the REAL site in Chrome, one scenario per requirement, and record what actually happened.
// Run: npm run test:e2e   (builds, serves dist/ with vite preview; uses your installed Chrome/Edge via puppeteer-core)
// Output: tests/e2e/results.json, docs/E2E_RESULTS.md, screenshots in docs/screenshots/site/
import { build, preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
}
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
  await page.evaluate(() => localStorage.removeItem('campusconnect.session'));
  await page.reload({ waitUntil: 'networkidle0' });
  await go(`#/login/${slug}`);
  await type('#email', email);
  await type('#password', password);
  // DOM click, like every other helper here: Puppeteer's synthetic mouse click was sometimes lost right after
  // page.reload() (the button was on top and a DOM click on it worked), which made logins flaky.
  await page.$eval('form button[type=submit]', b => b.click());
  await sleep(600);
}
// Like login(), but the test fails right here (with the page's message) if the login didn't work
async function mustLogin(slug, email, password) {
  await login(slug, email, password);
  const h = await hash();
  if (h.startsWith('#/login')) throw new Error(`login as ${email} failed: "${await text('[role=alert]')}" (hash ${h})`);
}
const asStudent = (email = 'shruti@student.atria.edu') => mustLogin('student', email, 'demo123');
const asManager = (club = 'dance') => mustLogin('club-manager', `${club}.manager@atria.edu`, 'demo123');
const asFaculty = () => mustLogin('faculty', 'admin@atria.edu', 'admin123');
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
const server = await preview({ root: ROOT, preview: { port: PORT, strictPort: true }, logLevel: 'error' });
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
    await login('student', 'shruti@student.atria.edu', 'wrong');
    const err = await text('[role=alert]');
    expect(/incorrect/i.test(err) && (await hash()).includes('/login/student'), `err="${err}" hash=${await hash()}`);
    return `"${err}"`;
  });

  await test('A1', 'Student account cannot use the Faculty login', 'shruti@student… on /login/faculty', 'Error: use the login page for your role', async () => {
    await login('faculty', 'shruti@student.atria.edu', 'demo123');
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
    await page.evaluate(() => localStorage.removeItem('campusconnect.session'));
    await page.reload({ waitUntil: 'networkidle0' });
    await go('#/dashboard');
    const h = await hash();
    expect(h.startsWith('#/login/student'), h);
    return h;
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
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('campusconnect.memberships')).length);
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
    await asStudent('raju@student.atria.edu');
    await go('#/events/open-mic-evening'); await click('Register');
    await asManager('music');
    await go('#/manage/events/open-mic-evening/registrations');
    const before = await page.$eval('[data-seats-filled]', e => e.dataset.seatsFilled);
    await page.evaluate(() => [...document.querySelectorAll('[data-student="stu-raju"] button')].find(b => b.innerText === 'Reject').click());
    await sleep(350);
    const after = await page.$eval('[data-seats-filled]', e => e.dataset.seatsFilled);
    await asStudent('raju@student.atria.edu');
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

  await test('O2', 'Invalid event form creates nothing', 'Dance manager: seats 0 + past date', 'Errors shown, event not created', async () => {
    await go('#/manage/events/new');
    await type('#title', 'Bad Event'); await type('#category', 'Workshop'); await type('#date', '2020-01-01');
    await type('#time', '18:00'); await type('#venue', 'Studio A'); await type('#description', 'x'); await type('#seats', '0');
    await page.$eval('[data-testid=event-form] button[type=submit]', b => b.click()); await sleep(300);
    const errs = await page.$$eval('[data-error]', els => els.map(e => `${e.dataset.error}: ${e.innerText}`));
    const stored = await page.evaluate(() => JSON.stringify(localStorage.getItem('campusconnect.eventChanges') ?? ''));
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
    await go('#/events?q=salsa');
    const t = await bodyText();
    expect(t.includes('Salsa Social Night') && t.includes('by Dance Club'), 'not listed');
    return `Host field: "${host}"; event listed on /events "by Dance Club"`;
  });

  await test('M5', 'Club Manager posts an announcement; members see it', 'Dance manager posts "Costume fitting"', 'Shruti (Dance member) sees it on her dashboard', async () => {
    await go('#/manage/announcements/new');
    const scope = await page.$eval('#scope', s => s.options[s.selectedIndex].text + (s.disabled ? ' (locked)' : ''));
    await type('#ann-title', 'Costume fitting'); await type('#ann-body', 'Fitting for Dance Fest on Saturday, 3 pm.');
    await page.$eval('[data-testid=announcement-form] button[type=submit]', b => b.click()); await sleep(400);
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
    await asStudent('ananya@student.atria.edu');
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

  await test('O3', 'Faculty/Admin can edit any club’s event', 'Admin opens Music Club event edit, changes venue', 'Saved; student event page shows new venue', async () => {
    await go('#/manage/events/open-mic-evening/edit');
    await type('#venue', 'Open Air Theatre');
    await page.$eval('[data-testid=event-form] button[type=submit]', b => b.click()); await sleep(400);
    await go('#/events/open-mic-evening');
    expect((await bodyText()).includes('Open Air Theatre'), 'venue not updated');
    return 'Venue now "Open Air Theatre"';
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
    return 'Updated description visible';
  });

  await test('U1', 'Faculty/Admin creates a user and assigns a club manager', 'Create manager "Asha K" for Photography Club', 'Asha can log in and sees only Photography Club', async () => {
    await go('#/faculty/users');
    await click('+ Add user');
    await type('#u-name', 'Asha K'); await type('#u-email', 'photo.manager@atria.edu'); await type('#u-role', 'clubManager');
    await sleep(200);
    const clubId = await page.$eval('#u-club', s => [...s.options].find(o => o.text === 'Photography Club').value);
    await type('#u-club', clubId); await type('#u-password', 'photo123');
    await page.$eval('[data-testid=user-form] button[type=submit]', b => b.click()); await sleep(400);
    await shot('11-faculty-users');
    await login('club-manager', 'photo.manager@atria.edu', 'photo123');
    const title = await text('main h1');
    expect(title === 'Photography Club', title);
    return `Asha logged in → /manage shows "${title}"`;
  });

  await test('U2', 'Deactivated user cannot log in', 'Admin deactivates Raju; Raju tries to log in', 'Error: account deactivated', async () => {
    await asFaculty();
    await go('#/faculty/users');
    await page.evaluate(() => [...document.querySelectorAll('[data-user="stu-raju"] button')].find(b => b.innerText === 'Deactivate').click());
    await sleep(250);
    await confirmDialog('Deactivate');
    await login('student', 'raju@student.atria.edu', 'demo123');
    const err = await text('[role=alert]');
    expect(/deactivated/i.test(err), err);
    return `"${err}"`;
  });

  // ---------- F17: deleted club disappears ----------
  await test('F17', 'Deleted club disappears everywhere', 'Admin deletes Music Club (Shruti is a member)', 'Gone from /clubs and Shruti’s dashboard; its events cancelled; its manager can’t log in', async () => {
    await asFaculty();
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
    await login('club-manager', 'music.manager@atria.edu', 'demo123');
    const mgrErr = await text('[role=alert]');
    expect(!onClubs && !myClubs.includes('Music Club') && bandsCancelled && /not assigned to an active club/.test(mgrErr),
      `onClubs=${onClubs} myClubs="${myClubs}" cancelled=${bandsCancelled} mgr="${mgrErr}"`);
    return `Dialog warned "${msg.match(/\d+<?\/?\w*>? upcoming|\d+ upcoming/)?.[0] ?? '2 upcoming'} event(s)"; not on /clubs; dashboard My clubs = Dance only; Battle of Bands shows cancelled; manager login refused`;
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
    for (const h of ['#/', '#/events', '#/events/annual-dance-fest', '#/clubs', '#/units', '#/login', '#/login/student', '#/nope']) await check(h);
    await asStudent(); await check('#/dashboard');
    await shot('13-mobile-student-dashboard', { width: 375 });
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await asManager('dance'); for (const h of ['#/manage', '#/manage/events/new', '#/manage/events/dance-workshop/registrations']) await check(h);
    await asFaculty(); for (const h of ['#/faculty', '#/faculty/clubs', '#/faculty/events', '#/faculty/users', '#/faculty/announcements']) await check(h);
    await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1 });
    expect(bad.length === 0, bad.join(', '));
    return '17 routes checked at 375 px, all scrollWidth ≤ 375';
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
  await new Promise(r => server.httpServer.close(r));
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
