// SQLite database (Node's built-in node:sqlite). One file: server/data/campusconnect.db (override with DB_PATH).
// Created and seeded from src/data/*.json on first run; `npm run db:reset` re-seeds it.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import seedUsers from '../src/data/users.json';
import seedClubs from '../src/data/clubs.json';
import seedUnits from '../src/data/units.json';
import seedEvents from '../src/data/events.json';
import seedAnnouncements from '../src/data/announcements.json';
import { hashPassword } from './passwords';
import type { AppClub, AppEvent, AppUnit, Announcement, Follow, Membership, Registration, User } from '../src/data/types';

export type DB = DatabaseSync;

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH = join(HERE, 'data', 'campusconnect.db');

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('student','clubManager','faculty')),
  club_id       TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','pending','declined')),
  created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, faculty_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clubs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0, unit_id TEXT NOT NULL, manager_name TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
  venue TEXT NOT NULL, description TEXT NOT NULL, seats_total INTEGER NOT NULL, seats_taken INTEGER NOT NULL DEFAULT 0,
  poster_url TEXT NOT NULL DEFAULT '', host_type TEXT NOT NULL CHECK (host_type IN ('club','unit')), host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  sample_attendees TEXT NOT NULL DEFAULT '[]', requires_approval INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status   TEXT NOT NULL CHECK (status IN ('confirmed','pending','rejected')),
  created_at TEXT NOT NULL,
  UNIQUE (event_id, user_id)
);
CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id TEXT NOT NULL REFERENCES clubs(id),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (user_id, club_id)
);
CREATE TABLE IF NOT EXISTS follows (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id TEXT NOT NULL REFERENCES units(id),
  PRIMARY KEY (user_id, unit_id)
);
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY, club_id TEXT, title TEXT NOT NULL, body TEXT NOT NULL, author_id TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0
);
`;

export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function openDb(path = process.env.DB_PATH || DEFAULT_DB_PATH): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (n === 0) seed(db);
  return db;
}

// Wipes all rows and loads the demo data again (demo passwords are hashed on the way in)
export function seed(db: DB): void {
  const now = new Date().toISOString();
  tx(db, () => {
    for (const t of ['sessions', 'registrations', 'memberships', 'follows', 'announcements', 'events', 'clubs', 'units', 'users']) {
      db.exec(`DELETE FROM ${t}`);
    }
    const u = db.prepare('INSERT INTO users (id,name,email,password_hash,role,club_id,active,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
    for (const s of seedUsers as Array<{ id: string; name: string; email: string; password: string; role: string; clubId?: string; active: boolean }>) {
      u.run(s.id, s.name, s.email, hashPassword(s.password), s.role, s.clubId ?? null, s.active ? 1 : 0, 'approved', now);
    }
    const un = db.prepare('INSERT INTO units (id,name,description,faculty_name) VALUES (?,?,?,?)');
    for (const s of seedUnits as AppUnit[]) un.run(s.id, s.name, s.description, s.facultyName);
    const c = db.prepare('INSERT INTO clubs (id,name,category,description,member_count,unit_id,manager_name) VALUES (?,?,?,?,?,?,?)');
    for (const s of seedClubs as AppClub[]) c.run(s.id, s.name, s.category, s.description, s.memberCount, s.unitId, s.managerName);
    const e = db.prepare(`INSERT INTO events (id,title,category,date,time,venue,description,seats_total,seats_taken,poster_url,host_type,host_id,status,sample_attendees,requires_approval)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const s of seedEvents as AppEvent[]) {
      e.run(s.id, s.title, s.category, s.date, s.time, s.venue, s.description, s.seatsTotal, s.seatsTaken, s.posterUrl,
        s.hostType, s.hostId, s.status, JSON.stringify(s.registrations ?? []), s.requiresApproval ? 1 : 0);
    }
    const a = db.prepare('INSERT INTO announcements (id,club_id,title,body,author_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)');
    for (const s of seedAnnouncements as Announcement[]) a.run(s.id, s.clubId, s.title, s.body, s.authorId, s.createdAt, s.updatedAt);
  });
}

// ---------- row → app object ----------
type Row = Record<string, unknown>;
const b = (v: unknown) => Number(v) === 1;

export const toUser = (r: Row): User => ({
  id: r.id as string, name: r.name as string, email: r.email as string, role: r.role as User['role'],
  ...(r.club_id ? { clubId: r.club_id as string } : {}), active: b(r.active), status: r.status as User['status'],
});
export const toClub = (r: Row): AppClub => ({
  id: r.id as string, name: r.name as string, category: r.category as AppClub['category'], description: r.description as string,
  memberCount: Number(r.member_count), unitId: r.unit_id as string, managerName: r.manager_name as string,
});
export const toUnit = (r: Row): AppUnit => ({
  id: r.id as string, name: r.name as string, description: r.description as string, facultyName: r.faculty_name as string,
});
export const toEvent = (r: Row): AppEvent => ({
  id: r.id as string, title: r.title as string, category: r.category as AppEvent['category'], date: r.date as string,
  time: r.time as string, venue: r.venue as string, description: r.description as string,
  seatsTotal: Number(r.seats_total), seatsTaken: Number(r.seats_taken), posterUrl: r.poster_url as string,
  hostType: r.host_type as AppEvent['hostType'], hostId: r.host_id as string, status: r.status as AppEvent['status'],
  registrations: JSON.parse(r.sample_attendees as string), requiresApproval: b(r.requires_approval),
});
export const toRegistration = (r: Row): Registration => ({
  id: r.id as string, eventId: r.event_id as string, userId: r.user_id as string,
  status: r.status as Registration['status'], createdAt: r.created_at as string,
});
export const toMembership = (r: Row): Membership => ({ userId: r.user_id as string, clubId: r.club_id as string, joinedAt: r.joined_at as string });
export const toFollow = (r: Row): Follow => ({ userId: r.user_id as string, unitId: r.unit_id as string });
export const toAnnouncement = (r: Row): Announcement => ({
  id: r.id as string, clubId: (r.club_id as string | null) ?? null, title: r.title as string, body: r.body as string,
  authorId: r.author_id as string, authorName: (r.author_name as string | null) ?? undefined,
  createdAt: r.created_at as string, updatedAt: r.updated_at as string,
});

// ---------- whole-table reads (the data set is small) ----------
export function loadAll(db: DB) {
  const all = <T>(sql: string, map: (r: Row) => T) => (db.prepare(sql).all() as Row[]).map(map);
  const users = all('SELECT * FROM users ORDER BY created_at, id', toUser);
  const clubs = all('SELECT * FROM clubs WHERE deleted = 0 ORDER BY rowid', toClub);
  const liveClubIds = new Set(clubs.map(c => c.id));
  return {
    users,
    clubs,
    liveClubIds,
    units: all('SELECT * FROM units ORDER BY rowid', toUnit),
    events: all('SELECT * FROM events ORDER BY rowid', toEvent),
    registrations: all('SELECT * FROM registrations ORDER BY created_at', toRegistration),
    memberships: all('SELECT * FROM memberships ORDER BY joined_at', toMembership).filter(m => liveClubIds.has(m.clubId)),
    follows: all('SELECT * FROM follows', toFollow),
    announcements: all(`SELECT a.*, u.name AS author_name FROM announcements a LEFT JOIN users u ON u.id = a.author_id
      WHERE a.deleted = 0 ORDER BY a.created_at DESC`, toAnnouncement).filter(a => a.clubId === null || liveClubIds.has(a.clubId)),
  };
}
export type Snapshot = ReturnType<typeof loadAll>;
