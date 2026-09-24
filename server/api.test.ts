// API tests: the real Express app + a real SQLite database (in memory), called over HTTP like the browser does.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from './app';
import { openDb, seed, type DB } from './db';

let db: DB;
let server: Server;
let base = '';

beforeAll(async () => {
  db = openDb(':memory:');
  server = createApp(db).listen(0);
  // Re-seeding hashes 16 passwords and blocks for a few seconds; a longer keep-alive stops the server closing
  // a pooled connection just as the next request reuses it (ECONNRESET)
  server.keepAliveTimeout = 60_000;
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
afterAll(() => server.close());
beforeEach(() => seed(db));

// A tiny browser: remembers the session cookie between calls
function client() {
  let cookie = '';
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    return { status: res.status, body: await res.json(), setCookie: set };
  };
  return {
    call,
    login: (email: string, password: string, role: string) => call('POST', '/auth/login', { email, password, role }),
    state: async () => (await call('GET', '/state')).body,
  };
}

const signup = { name: 'Neha Rao', email: 'neha@atria.edu.in', password: 'campus2026', confirm: 'campus2026', role: 'student' };

describe('credentials are stored safely (SU4)', () => {
  it('seed passwords are hashed with scrypt, never stored in plain text', () => {
    const rows = db.prepare('SELECT password_hash FROM users').all() as Array<{ password_hash: string }>;
    expect(rows.length).toBe(16);
    expect(rows.every(r => r.password_hash.startsWith('scrypt$') && !r.password_hash.includes('demo123'))).toBe(true);
  });
  it('the API never returns password hashes', async () => {
    const fac = client();
    await fac.login('admin@atria.edu.in', 'admin123', 'faculty');
    expect(JSON.stringify(await fac.state())).not.toContain('scrypt$');
  });
  it('session cookie is httpOnly and the DB stores only its hash', async () => {
    const c = client();
    const res = await c.login('shruti@atria.edu.in', 'demo123', 'student');
    expect(res.setCookie).toMatch(/HttpOnly/i);
    const token = res.setCookie!.split(';')[0].split('=')[1];
    const stored = db.prepare('SELECT token_hash FROM sessions').all() as Array<{ token_hash: string }>;
    expect(stored.some(s => s.token_hash === token)).toBe(false);
  });
});

describe('sign up and log in later (SU1)', () => {
  it('a new student can sign up, is logged in, and can log in again after logging out', async () => {
    const c = client();
    const res = await c.call('POST', '/auth/signup', signup);
    expect(res.body).toEqual({ ok: true, status: 'approved' });
    expect((await c.state()).currentUser.email).toBe('neha@atria.edu.in');
    await c.call('POST', '/auth/logout');
    expect((await c.state()).session).toBeNull();
    const again = await c.login('NEHA@atria.edu.in', 'campus2026', 'student');
    expect(again.status).toBe(200);
    expect((await c.state()).currentUser.name).toBe('Neha Rao');
  });
  it('the account survives a restart (it is in the database)', async () => {
    await client().call('POST', '/auth/signup', signup);
    const row = db.prepare('SELECT role, status FROM users WHERE email = ?').get('neha@atria.edu.in');
    expect(row).toEqual({ role: 'student', status: 'approved' });
  });
  it('duplicate email and weak password are refused', async () => {
    const dup = await client().call('POST', '/auth/signup', { ...signup, email: 'Shruti@atria.edu.in' });
    expect(dup.status).toBe(400);
    expect(dup.body.errors).toHaveProperty('email');
    const weak = await client().call('POST', '/auth/signup', { ...signup, email: 'x@y.edu', password: 'abc', confirm: 'abc' });
    expect(weak.body.errors).toHaveProperty('password');
  });
  it('SU5: the server refuses non-Atria emails even if the page is bypassed', async () => {
    for (const email of ['neha@gmail.com', 'neha@atria.edu', 'neha@atria.edu.in.evil.com']) {
      const r = await client().call('POST', '/auth/signup', { ...signup, email });
      expect(r.status, email).toBe(400);
      expect(r.body.errors.email).toMatch(/@atria\.edu\.in/);
    }
    const f = client();
    await f.login('admin@atria.edu.in', 'admin123', 'faculty');
    const created = await f.call('PUT', '/users/outsider-1', { name: 'Out Sider', email: 'out@yahoo.com', role: 'student', password: 'secret1' });
    expect(created.status).toBe(400);
    expect((db.prepare("SELECT COUNT(*) AS n FROM users WHERE email NOT LIKE '%@atria.edu.in'").get() as { n: number }).n).toBe(0);
  });
  it('wrong password gets the same message as an unknown email', async () => {
    const a = await client().login('shruti@atria.edu.in', 'wrong', 'student');
    const b = await client().login('nobody@atria.edu.in', 'wrong', 'student');
    expect(a.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });
});

describe('staff sign-ups need approval (SU2, SU3)', () => {
  it('club-manager sign-up is pending until that club’s faculty head approves', async () => {
    const res = await client().call('POST', '/auth/signup', { ...signup, email: 'new.dance@atria.edu.in', role: 'clubManager', clubId: 'dance-club' });
    expect(res.body.status).toBe('pending');
    const early = await client().login('new.dance@atria.edu.in', 'campus2026', 'clubManager');
    expect(early.status).toBe(403);
    expect(early.body.error).toMatch(/waiting for approval/);

    const musicHead = client();
    await musicHead.login('meera.nair@atria.edu.in', 'admin123', 'faculty');
    const pendingId = (await musicHead.state()).users.find((u: { email: string }) => u.email === 'new.dance@atria.edu.in').id;
    expect((await musicHead.call('POST', `/users/${pendingId}/review`, { decision: 'approve' })).status).toBe(403);

    const danceHead = client();
    await danceHead.login('admin@atria.edu.in', 'admin123', 'faculty');
    expect((await danceHead.call('POST', `/users/${pendingId}/review`, { decision: 'approve' })).status).toBe(200);
    const later = client();
    expect((await later.login('new.dance@atria.edu.in', 'campus2026', 'clubManager')).status).toBe(200);
    expect((await later.state()).session.clubId).toBe('dance-club');
  });
  it('faculty sign-up can only request a club without a head; a declined request cannot log in', async () => {
    const taken = await client().call('POST', '/auth/signup', { ...signup, email: 'f@atria.edu.in', role: 'faculty', clubId: 'dance-club' });
    expect(taken.body.errors).toHaveProperty('clubId');
    const head = client();
    await head.login('admin@atria.edu.in', 'admin123', 'faculty');
    await head.call('PUT', '/clubs/photo-club', { name: 'Photo Club', category: 'Arts & Culture', description: 'Photos', unitId: 'beyonder-studios', managerName: 'Asha' });
    const req = await client().call('POST', '/auth/signup', { ...signup, email: 'f@atria.edu.in', role: 'faculty', clubId: 'photo-club' });
    expect(req.body.status).toBe('pending');
    const id = (await head.state()).users.find((u: { email: string }) => u.email === 'f@atria.edu.in').id;
    await head.call('POST', `/users/${id}/review`, { decision: 'decline' });
    const r = await client().login('f@atria.edu.in', 'campus2026', 'faculty');
    expect(r.body.error).toMatch(/declined/);
  });
});

describe('the server enforces the rules, not just the pages', () => {
  it('logged-out and student requests to staff endpoints are refused', async () => {
    expect((await client().call('POST', '/events/open-mic-evening/cancel')).status).toBe(401);
    const s = client();
    await s.login('shruti@atria.edu.in', 'demo123', 'student');
    expect((await s.call('POST', '/events/open-mic-evening/cancel')).status).toBe(403);
  });
  it('a Dance manager cannot cancel a Music event; a faculty head cannot deactivate another faculty', async () => {
    const m = client();
    await m.login('dance.manager@atria.edu.in', 'demo123', 'clubManager');
    expect((await m.call('POST', '/events/open-mic-evening/cancel')).status).toBe(403);
    const f = client();
    await f.login('admin@atria.edu.in', 'admin123', 'faculty');
    expect((await f.call('PATCH', '/users/fac-vikram/active', { active: false })).status).toBe(403);
    expect((await f.call('PATCH', '/users/stu-raju/active', { active: false })).status).toBe(200);
  });
  it('2-club limit and full events are enforced by the server', async () => {
    const s = client();
    await s.login('shruti@atria.edu.in', 'demo123', 'student');
    await s.call('POST', '/clubs/dance-club/membership');
    await s.call('POST', '/clubs/music-club/membership');
    const third = await s.call('POST', '/clubs/sports-club/membership');
    expect(third.status).toBe(409);
    expect(third.body.error).toBe('limit');
    expect((await s.call('POST', '/events/twenty-four-hour-hackathon/registration')).body.error).toBe('full');
  });
  it('F9b/M8: joining is a request the club’s manager or faculty head approves; others cannot', async () => {
    const s = client();
    await s.login('shruti@atria.edu.in', 'demo123', 'student');
    expect((await s.call('POST', '/clubs/dance-club/membership')).body.status).toBe('pending');
    expect((await s.state()).memberCounts['dance-club']).toBeUndefined(); // pending doesn't count as a member
    const music = client();
    await music.login('music.manager@atria.edu.in', 'demo123', 'clubManager');
    expect((await music.call('PATCH', '/clubs/dance-club/members/stu-shruti', { status: 'approved' })).status).toBe(403);
    const musicHead = client();
    await musicHead.login('meera.nair@atria.edu.in', 'admin123', 'faculty');
    expect((await musicHead.call('PATCH', '/clubs/dance-club/members/stu-shruti', { status: 'approved' })).status).toBe(403);
    const dance = client();
    await dance.login('dance.manager@atria.edu.in', 'demo123', 'clubManager');
    expect((await dance.state()).memberships).toEqual([expect.objectContaining({ userId: 'stu-shruti', status: 'pending' })]);
    expect((await dance.call('PATCH', '/clubs/dance-club/members/stu-shruti', { status: 'approved' })).status).toBe(200);
    expect((await s.state()).memberCounts['dance-club']).toBe(1);
    // the faculty head of the club can remove the member
    const head = client();
    await head.login('admin@atria.edu.in', 'admin123', 'faculty');
    expect((await head.call('DELETE', '/clubs/dance-club/members/stu-shruti')).status).toBe(200);
    expect((await s.state()).memberships).toEqual([]);
  });
  it('a rejected request frees the slot and can be sent again', async () => {
    const s = client();
    await s.login('raju@atria.edu.in', 'demo123', 'student');
    await s.call('POST', '/clubs/dance-club/membership');
    const dance = client();
    await dance.login('dance.manager@atria.edu.in', 'demo123', 'clubManager');
    await dance.call('PATCH', '/clubs/dance-club/members/stu-raju', { status: 'rejected' });
    expect((await s.state()).memberships[0].status).toBe('rejected');
    expect((await s.call('POST', '/clubs/dance-club/membership')).body.status).toBe('pending');
  });
  it('students only see their own registrations; seat counts stay correct', async () => {
    const a = client();
    await a.login('shruti@atria.edu.in', 'demo123', 'student');
    await a.call('POST', '/events/open-mic-evening/registration');
    const b = client();
    await b.login('raju@atria.edu.in', 'demo123', 'student');
    const st = await b.state();
    expect(st.registrations).toEqual([]);
    expect(st.seatCounts['open-mic-evening']).toBe(1);
    expect(st.users.map((u: { id: string }) => u.id)).toEqual(['stu-raju']);
  });
  it('deactivating a user ends their open session', async () => {
    const s = client();
    await s.login('raju@atria.edu.in', 'demo123', 'student');
    const f = client();
    await f.login('admin@atria.edu.in', 'admin123', 'faculty');
    await f.call('PATCH', '/users/stu-raju/active', { active: false });
    expect((await s.state()).session).toBeNull();
  });
});
