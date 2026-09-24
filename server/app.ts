// CampusConnect API. Every write re-checks the SAME rules the pages use (src/lib), because anything in the
// browser can be bypassed. The database is the only source of truth.
import express, { type NextFunction, type Request, type Response } from 'express';
import { loadAll, seed, tx, type DB, type Snapshot } from './db';
import { DUMMY_HASH, hashPassword, newToken, tokenHash, verifyPassword } from './passwords';
import type { AppEvent, Registration, Session, User } from '../src/data/types';
import type { RegStatus, Role } from '../src/lib/constants';
import { BAD_LOGIN, loginDecision, validateSession } from '../src/lib/auth';
import { initialStatus, localActiveCount, registerBlockReason, reviewBlockReason } from '../src/lib/registrations';
import { joinBlockReason } from '../src/lib/memberships';
import { eventsToCancelOnDelete } from '../src/lib/clubs';
import {
  allowedHosts, assignableClubs, canAddClub, canDeactivateUser, canDeleteClub, canEditClub, canEditUser,
  canManageAnnouncement, canManageEvent, canReviewSignup, isFaculty,
} from '../src/lib/permissions';
import { validateAnnouncement, validateClub, validateEvent, validateSignup, validateUser, type Errors } from '../src/lib/validation';
import { seatsTakenNow } from '../src/lib/seats';
import { getToday } from '../src/lib/date';
import { isSafeId, makeId } from '../src/lib/ids';

const COOKIE = 'cc_session';
const SESSION_DAYS = 7;

type Req = Request & { actor?: Session | null; snap?: Snapshot };

// ---------- helpers ----------
class HttpError extends Error {
  constructor(public status: number, message: string, public errors?: Errors) { super(message); }
}
const fail = (status: number, message: string, errors?: Errors): never => { throw new HttpError(status, message, errors); };
const need = (cond: unknown, status: number, message: string) => { if (!cond) fail(status, message); };
const str = (v: unknown) => (typeof v === 'string' ? v : '');

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function openHeadClubs(snap: Snapshot): string[] {
  const headed = new Set(snap.users.filter(u => u.role === 'faculty' && u.status === 'approved' && u.active).map(u => u.clubId));
  return snap.clubs.filter(c => !headed.has(c.id)).map(c => c.id);
}

// What each role may see (private data is filtered here, not in the browser)
function visibleState(snap: Snapshot, actor: Session | null) {
  const { users, events, registrations, memberships, follows } = snap;
  const me = actor ? users.find(u => u.id === actor.userId) ?? null : null;
  const manageable = new Set(events.filter(e => canManageEvent(actor, e)).map(e => e.id));

  let visibleUsers: User[] = [];
  let visibleRegs: Registration[] = [];
  let visibleMemberships = memberships.filter(m => m.userId === actor?.userId);
  if (actor?.role === 'faculty') {
    visibleUsers = users;
    visibleRegs = registrations;
    visibleMemberships = memberships;
  } else if (actor?.role === 'clubManager') {
    const clubMembers = memberships.filter(m => m.clubId === actor.clubId);
    visibleRegs = registrations.filter(r => manageable.has(r.eventId));
    const ids = new Set([actor.userId, ...clubMembers.map(m => m.userId), ...visibleRegs.map(r => r.userId)]);
    visibleUsers = users.filter(u => ids.has(u.id));
    visibleMemberships = clubMembers;
  } else if (actor) {
    visibleUsers = me ? [me] : [];
    visibleRegs = registrations.filter(r => r.userId === actor.userId);
  }

  const seatCounts: Record<string, number> = {};
  for (const e of events) seatCounts[e.id] = localActiveCount(e.id, registrations);
  const memberCounts: Record<string, number> = {};
  for (const m of memberships) memberCounts[m.clubId] = (memberCounts[m.clubId] ?? 0) + 1;

  return {
    session: actor,
    currentUser: me,
    users: visibleUsers,
    events,
    clubs: snap.clubs,
    units: snap.units,
    announcements: snap.announcements,
    registrations: visibleRegs,
    memberships: visibleMemberships,
    follows: follows.filter(f => f.userId === actor?.userId),
    seatCounts,
    memberCounts,
    openHeadClubs: openHeadClubs(snap),
  };
}
export type ApiState = ReturnType<typeof visibleState>;

export function createApp(db: DB) {
  const app = express();
  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));

  // Load a fresh snapshot + the session for every request
  api.use((req: Req, _res, next) => {
    const snap = loadAll(db);
    req.snap = snap;
    req.actor = null;
    const token = readCookie(req, COOKIE);
    if (token) {
      const row = db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
        .get(tokenHash(token), new Date().toISOString()) as { user_id: string } | undefined;
      const user = row && snap.users.find(u => u.id === row.user_id);
      // validateSession: deactivated / declined / role change / deleted club → logged out
      if (user) req.actor = validateSession({ userId: user.id, role: user.role, clubId: user.clubId }, snap.users, snap.liveClubIds);
    }
    next();
  });

  const wrap = (fn: (req: Req, res: Response) => unknown) => (req: Req, res: Response, next: NextFunction) => {
    try {
      const out = fn(req, res);
      if (!res.headersSent) res.json(out ?? { ok: true });
    } catch (e) {
      next(e);
    }
  };
  const actorOf = (req: Req): Session => req.actor ?? fail(401, 'Please log in.');

  function startSession(res: Response, userId: string) {
    const token = newToken();
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000);
    db.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)')
      .run(tokenHash(token), userId, now.toISOString(), expires.toISOString());
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === '1', maxAge: SESSION_DAYS * 86400_000, path: '/' });
  }

  // ---------- state ----------
  api.get('/state', wrap(req => visibleState(req.snap!, req.actor ?? null)));

  // ---------- auth ----------
  api.post('/auth/signup', wrap((req, res) => {
    const snap = req.snap!;
    const input = {
      name: str(req.body.name).trim(), email: str(req.body.email).trim().toLowerCase(), password: str(req.body.password),
      confirm: str(req.body.confirm), role: str(req.body.role), clubId: str(req.body.clubId) || undefined,
    };
    const errors = validateSignup(input, snap.users, snap.liveClubIds, new Set(openHeadClubs(snap)));
    if (Object.keys(errors).length) fail(400, 'Please fix the highlighted fields.', errors);
    const id = makeId(input.name);
    // SU1/SU2: students are active at once; Club Manager / Faculty requests wait for approval
    const status = input.role === 'student' ? 'approved' : 'pending';
    db.prepare('INSERT INTO users (id,name,email,password_hash,role,club_id,active,status,created_at) VALUES (?,?,?,?,?,?,1,?,?)')
      .run(id, input.name, input.email, hashPassword(input.password), input.role,
        input.role === 'student' ? null : input.clubId ?? null, status, new Date().toISOString());
    if (status === 'approved') startSession(res, id);
    return { ok: true, status };
  }));

  api.post('/auth/login', wrap((req, res) => {
    const email = str(req.body.email).trim();
    const password = str(req.body.password);
    const role = str(req.body.role) as Role;
    const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email) as { id: string; password_hash: string } | undefined;
    const passwordOk = verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !passwordOk) fail(401, BAD_LOGIN);
    const user = req.snap!.users.find(u => u.id === row!.id)!;
    const decision = loginDecision(user, role, req.snap!.liveClubIds);
    if (!decision.ok) fail(403, decision.error);
    startSession(res, user.id);
    return { ok: true };
  }));

  api.post('/auth/logout', wrap((req, res) => {
    const token = readCookie(req, COOKIE);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
    res.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  }));

  // ---------- student actions ----------
  api.post('/events/:id/registration', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const event = snap.events.find(e => e.id === String(req.params.id)) ?? fail(404, 'Event not found.');
    const block = registerBlockReason({
      event, role: actor.role, userId: actor.userId, regs: snap.registrations,
      taken: localActiveCount(event.id, snap.registrations), today: getToday(),
    });
    if (block) fail(block === 'not-student' ? 403 : 409, block);
    const reg: Registration = { id: makeId(`reg-${event.id}`), eventId: event.id, userId: actor.userId, status: initialStatus(event), createdAt: new Date().toISOString() };
    db.prepare('INSERT INTO registrations (id,event_id,user_id,status,created_at) VALUES (?,?,?,?,?)').run(reg.id, reg.eventId, reg.userId, reg.status, reg.createdAt);
    return { ok: true, registration: reg };
  }));

  api.delete('/events/:id/registration', wrap(req => {
    const actor = actorOf(req);
    db.prepare('DELETE FROM registrations WHERE event_id = ? AND user_id = ?').run(String(req.params.id), actor.userId); // rule 5
  }));

  api.post('/clubs/:id/membership', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const clubId = String(req.params.id);
    need(snap.liveClubIds.has(clubId), 404, 'Club not found.');
    const block = joinBlockReason({ role: actor.role, userId: actor.userId, clubId, memberships: snap.memberships, liveClubIds: snap.liveClubIds });
    if (block) fail(block === 'not-student' ? 403 : 409, block);
    db.prepare('INSERT INTO memberships (user_id,club_id,joined_at) VALUES (?,?,?)').run(actor.userId, clubId, new Date().toISOString());
  }));

  api.delete('/clubs/:id/membership', wrap(req => {
    const actor = actorOf(req);
    db.prepare('DELETE FROM memberships WHERE user_id = ? AND club_id = ?').run(actor.userId, String(req.params.id));
  }));

  api.post('/units/:id/follow', wrap(req => {
    const actor = actorOf(req);
    need(actor.role === 'student', 403, 'Only students follow units.');
    need(req.snap!.units.some(u => u.id === String(req.params.id)), 404, 'Unit not found.');
    db.prepare('INSERT OR IGNORE INTO follows (user_id,unit_id) VALUES (?,?)').run(actor.userId, String(req.params.id));
  }));

  api.delete('/units/:id/follow', wrap(req => {
    const actor = actorOf(req);
    db.prepare('DELETE FROM follows WHERE user_id = ? AND unit_id = ?').run(actor.userId, String(req.params.id));
  }));

  // ---------- staff: events ----------
  api.put('/events/:id', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const id = String(req.params.id);
    need(isSafeId(id), 400, 'Bad event id.');
    const existing = snap.events.find(e => e.id === id);
    const b = req.body ?? {};
    const hostType = str(b.hostType) as AppEvent['hostType'];
    const hostId = str(b.hostId);
    if (existing) {
      need(canManageEvent(actor, existing), 403, 'You cannot edit this event.'); // O4
      need(existing.status !== 'cancelled', 409, 'This event was cancelled and can no longer be edited.');
    }
    need(allowedHosts(actor, snap.clubs, snap.units).some(h => h.type === hostType && h.id === hostId), 403, 'You cannot host events as this club or unit.'); // rule 13
    const input = {
      title: str(b.title), category: str(b.category), date: str(b.date), time: str(b.time),
      venue: str(b.venue), description: str(b.description), seatsTotal: Number(b.seatsTotal),
    };
    const takenNow = existing ? seatsTakenNow(existing.seatsTaken, localActiveCount(id, snap.registrations)) : 0;
    const errors = validateEvent(input, takenNow); // rules 14, 15
    if (Object.keys(errors).length) fail(400, 'Please fix the highlighted fields.', errors);
    const approval = b.requiresApproval ? 1 : 0;
    if (existing) {
      db.prepare(`UPDATE events SET title=?, category=?, date=?, time=?, venue=?, description=?, seats_total=?, host_type=?, host_id=?, requires_approval=? WHERE id=?`)
        .run(input.title.trim(), input.category, input.date, input.time, input.venue.trim(), input.description.trim(), input.seatsTotal, hostType, hostId, approval, id);
    } else {
      db.prepare(`INSERT INTO events (id,title,category,date,time,venue,description,seats_total,seats_taken,poster_url,host_type,host_id,status,sample_attendees,requires_approval)
        VALUES (?,?,?,?,?,?,?,?,0,'',?,?,'active','[]',?)`)
        .run(id, input.title.trim(), input.category, input.date, input.time, input.venue.trim(), input.description.trim(), input.seatsTotal, hostType, hostId, approval);
    }
    return { ok: true, id };
  }));

  api.post('/events/:id/cancel', wrap(req => {
    const actor = actorOf(req);
    const event = req.snap!.events.find(e => e.id === String(req.params.id)) ?? fail(404, 'Event not found.');
    need(canManageEvent(actor, event), 403, 'You cannot cancel this event.');
    db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(event.id); // rule 16
  }));

  api.patch('/registrations/:id', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const reg = snap.registrations.find(r => r.id === String(req.params.id)) ?? fail(404, 'Registration not found.');
    const event = snap.events.find(e => e.id === reg.eventId)!;
    need(canManageEvent(actor, event), 403, 'These registrations belong to another club.');
    const next = str(req.body.status) as RegStatus;
    need(['confirmed', 'pending', 'rejected'].includes(next), 400, 'Bad status.');
    const block = reviewBlockReason(event, reg, next, snap.registrations);
    if (block) fail(409, block);
    db.prepare('UPDATE registrations SET status = ? WHERE id = ?').run(next, reg.id);
  }));

  // ---------- faculty: clubs ----------
  api.put('/clubs/:id', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const id = String(req.params.id);
    need(isSafeId(id), 400, 'Bad club id.');
    const existing = snap.clubs.find(c => c.id === id);
    need(existing ? canEditClub(actor, id) : canAddClub(actor), 403, existing ? 'You can only edit the club you head.' : 'Only faculty can add clubs.');
    const b = req.body ?? {};
    const input = { id: existing?.id, name: str(b.name), category: str(b.category), description: str(b.description), managerName: str(b.managerName) };
    const errors = validateClub(input, snap.clubs);
    if (!snap.units.some(u => u.id === str(b.unitId))) errors.unitId = 'Pick a supervising unit';
    if (Object.keys(errors).length) fail(400, 'Please fix the highlighted fields.', errors);
    if (existing) {
      db.prepare('UPDATE clubs SET name=?, category=?, description=?, unit_id=?, manager_name=? WHERE id=?')
        .run(input.name.trim(), input.category, input.description.trim(), str(b.unitId), input.managerName.trim(), id);
    } else {
      db.prepare('INSERT INTO clubs (id,name,category,description,member_count,unit_id,manager_name) VALUES (?,?,?,?,0,?,?)')
        .run(id, input.name.trim(), input.category, input.description.trim(), str(b.unitId), input.managerName.trim());
    }
    return { ok: true, id };
  }));

  api.delete('/clubs/:id', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const id = String(req.params.id);
    need(snap.liveClubIds.has(id), 404, 'Club not found.');
    need(canDeleteClub(actor, id), 403, 'You can only delete the club you head.');
    const toCancel = eventsToCancelOnDelete(id, snap.events, getToday()); // rule 20
    tx(db, () => {
      db.prepare('UPDATE clubs SET deleted = 1 WHERE id = ?').run(id);
      for (const e of toCancel) db.prepare("UPDATE events SET status = 'cancelled' WHERE id = ?").run(e);
      db.prepare('DELETE FROM memberships WHERE club_id = ?').run(id);
    });
    return { ok: true, cancelled: toCancel.length };
  }));

  // ---------- announcements ----------
  api.put('/announcements/:id', wrap(req => {
    const actor = actorOf(req);
    const id = String(req.params.id);
    need(isSafeId(id), 400, 'Bad announcement id.');
    const existing = db.prepare('SELECT club_id FROM announcements WHERE id = ? AND deleted = 0').get(id) as { club_id: string | null } | undefined;
    const clubId = req.body.clubId ? str(req.body.clubId) : null;
    if (existing) need(canManageAnnouncement(actor, { clubId: existing.club_id }), 403, 'This announcement belongs to another club.');
    need(canManageAnnouncement(actor, { clubId }), 403, 'You can only post to your own club.');
    const input = { title: str(req.body.title), body: str(req.body.body) };
    const errors = validateAnnouncement(input);
    if (Object.keys(errors).length) fail(400, 'Please fix the highlighted fields.', errors);
    const now = new Date().toISOString();
    if (existing) {
      db.prepare('UPDATE announcements SET title=?, body=?, club_id=?, updated_at=? WHERE id=?').run(input.title.trim(), input.body.trim(), clubId, now, id);
    } else {
      db.prepare('INSERT INTO announcements (id,club_id,title,body,author_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, clubId, input.title.trim(), input.body.trim(), actor.userId, now, now);
    }
    return { ok: true, id };
  }));

  api.delete('/announcements/:id', wrap(req => {
    const actor = actorOf(req);
    const row = db.prepare('SELECT club_id FROM announcements WHERE id = ? AND deleted = 0').get(String(req.params.id)) as { club_id: string | null } | undefined;
    need(row, 404, 'Announcement not found.');
    need(canManageAnnouncement(actor, { clubId: row!.club_id }), 403, 'This announcement belongs to another club.');
    db.prepare('UPDATE announcements SET deleted = 1 WHERE id = ?').run(String(req.params.id));
  }));

  // ---------- faculty: users ----------
  api.put('/users/:id', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    need(isFaculty(actor), 403, 'Only faculty manage users.');
    const id = String(req.params.id);
    need(isSafeId(id), 400, 'Bad user id.');
    const existing = snap.users.find(u => u.id === id);
    const b = req.body ?? {};
    const role = str(b.role) as Role;
    const needsClub = role === 'clubManager' || role === 'faculty';
    const input = {
      id: existing?.id, name: str(b.name), email: str(b.email), role, clubId: needsClub ? str(b.clubId) : undefined,
      password: existing ? undefined : str(b.password),
    };
    const editingSelf = existing?.id === actor.userId;
    if (existing) need(canEditUser(actor, existing), 403, 'You cannot change this account.'); // rule 26 / U3
    const errors = validateUser(input, snap.users, snap.liveClubIds);
    if (editingSelf && (role !== existing!.role || input.clubId !== existing!.clubId)) errors.role = "You can't change your own role or club";
    if (needsClub && !editingSelf && !assignableClubs(actor, role, snap.clubs, snap.users, existing?.id).some(c => c.id === input.clubId)) {
      errors.clubId = role === 'clubManager' ? 'You can only assign club managers to the club you head' : 'Pick a club that has no faculty head yet';
    }
    if (Object.keys(errors).length) fail(400, 'Please fix the highlighted fields.', errors);
    if (existing) {
      db.prepare('UPDATE users SET name=?, email=?, role=?, club_id=? WHERE id=?').run(input.name.trim(), input.email.trim().toLowerCase(), role, input.clubId ?? null, id);
    } else {
      db.prepare("INSERT INTO users (id,name,email,password_hash,role,club_id,active,status,created_at) VALUES (?,?,?,?,?,?,1,'approved',?)")
        .run(id, input.name.trim(), input.email.trim().toLowerCase(), hashPassword(input.password!), role, input.clubId ?? null, new Date().toISOString());
    }
    return { ok: true, id };
  }));

  api.patch('/users/:id/active', wrap(req => {
    const actor = actorOf(req);
    const target = req.snap!.users.find(u => u.id === String(req.params.id)) ?? fail(404, 'User not found.');
    need(canDeactivateUser(actor, target), 403, 'You cannot deactivate this account.'); // U3
    const active = !!req.body.active;
    tx(db, () => {
      db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, target.id);
      if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id); // log them out everywhere
    });
  }));

  api.post('/users/:id/review', wrap(req => {
    const actor = actorOf(req);
    const snap = req.snap!;
    const target = snap.users.find(u => u.id === String(req.params.id)) ?? fail(404, 'User not found.');
    need(canReviewSignup(actor, target, snap.users), 403, 'You cannot review this sign-up request.'); // SU2
    const decision = str(req.body.decision);
    need(decision === 'approve' || decision === 'decline', 400, 'Bad decision.');
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(decision === 'approve' ? 'approved' : 'declined', target.id);
  }));

  // ---------- test support (only when CC_TEST_RESET=1, never in normal runs) ----------
  if (process.env.CC_TEST_RESET === '1') {
    api.post('/test/reset', wrap(() => { seed(db); }));
  }

  // ---------- errors ----------
  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ ok: false, error: err.message, ...(err.errors ? { errors: err.errors } : {}) });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed: users.email/.test(message)) {
      res.status(409).json({ ok: false, error: 'An account with this email already exists.', errors: { email: 'An account with this email already exists.' } });
      return;
    }
    if (/UNIQUE constraint failed/.test(message)) { res.status(409).json({ ok: false, error: 'already' }); return; }
    console.error(err);
    res.status(500).json({ ok: false, error: 'Something went wrong on the server.' });
  });

  app.use('/api', api);
  return app;
}

