import { describe, it, expect } from 'vitest';
import clubs from '../data/clubs.json';
import users from '../data/users.json';
import { validateEvent, validateClub, validateAnnouncement, validateUser, validateSignup, type EventInput } from './validation';

describe('validateSignup (SU1)', () => {
  const live = new Set(clubs.map(c => c.id));
  const open = new Set(['sports-club']);
  const ok = { name: 'Neha Rao', email: 'neha@student.atria.edu', password: 'campus2026', confirm: 'campus2026', role: 'student' };
  it('accepts a valid student sign-up', () => {
    expect(validateSignup(ok, users, live, open)).toEqual({});
  });
  it('rejects an email that already has an account (case-insensitive)', () => {
    expect(validateSignup({ ...ok, email: 'SHRUTI@student.atria.edu' }, users, live, open)).toHaveProperty('email');
  });
  it('needs 8+ characters with letters and numbers, typed twice', () => {
    expect(validateSignup({ ...ok, password: 'short1', confirm: 'short1' }, users, live, open)).toHaveProperty('password');
    expect(validateSignup({ ...ok, password: 'onlyletters', confirm: 'onlyletters' }, users, live, open)).toHaveProperty('password');
    expect(validateSignup({ ...ok, confirm: 'different1' }, users, live, open)).toHaveProperty('confirm');
  });
  it('club managers must pick an existing club', () => {
    expect(validateSignup({ ...ok, role: 'clubManager' }, users, live, open)).toHaveProperty('clubId');
    expect(validateSignup({ ...ok, role: 'clubManager', clubId: 'dance-club' }, users, live, open)).toEqual({});
  });
  it('faculty may only request a club without a head', () => {
    expect(validateSignup({ ...ok, role: 'faculty', clubId: 'dance-club' }, users, live, open)).toHaveProperty('clubId');
    expect(validateSignup({ ...ok, role: 'faculty', clubId: 'sports-club' }, users, live, open)).toEqual({});
  });
});

describe('validateAnnouncement (M5)', () => {
  it('accepts title + message', () => {
    expect(validateAnnouncement({ title: 'Rehearsal moved', body: 'Now in Studio B.' })).toEqual({});
  });
  it('rejects empty title and message', () => {
    expect(Object.keys(validateAnnouncement({ title: ' ', body: '' })).sort()).toEqual(['body', 'title']);
  });
  it('rejects a title over 80 characters', () => {
    expect(validateAnnouncement({ title: 'x'.repeat(81), body: 'ok' })).toHaveProperty('title');
  });
});

describe('validateUser (U1)', () => {
  const live = new Set(clubs.map(c => c.id));
  const base = { name: 'New Student', email: 'new@student.atria.edu', role: 'student', password: 'secret1' };
  it('accepts a new student', () => {
    expect(validateUser(base, users, live)).toEqual({});
  });
  it('rejects a duplicate email (case-insensitive)', () => {
    expect(validateUser({ ...base, email: 'ADMIN@atria.edu' }, users, live)).toHaveProperty('email');
  });
  it('a club manager must be assigned to an existing club', () => {
    expect(validateUser({ ...base, role: 'clubManager' }, users, live)).toHaveProperty('clubId');
    expect(validateUser({ ...base, role: 'clubManager', clubId: 'music-club' }, users, live)).toEqual({});
  });
  it('a faculty member must head an existing club', () => {
    expect(validateUser({ ...base, role: 'faculty' }, users, live)).toHaveProperty('clubId');
    expect(validateUser({ ...base, role: 'faculty', clubId: 'music-club' }, users, live)).toEqual({});
  });
  it('new users need a 6+ character password; edits do not', () => {
    expect(validateUser({ ...base, password: '123' }, users, live)).toHaveProperty('password');
    expect(validateUser({ ...base, id: 'stu-raju', email: 'raju@student.atria.edu', password: undefined }, users, live)).toEqual({});
  });
});

const TODAY = '2026-11-01';
const valid: EventInput = {
  title: 'Salsa Night',
  category: 'Cultural & Social',
  date: '2026-12-01',
  time: '18:00',
  venue: 'Studio A',
  description: 'Beginner salsa social.',
  seatsTotal: 40,
};

describe('validateEvent (rule 14, O2, O5)', () => {
  it('accepts a valid event', () => {
    expect(validateEvent(valid, 0, TODAY)).toEqual({});
  });
  it('O2: seats = 0 is rejected', () => {
    expect(validateEvent({ ...valid, seatsTotal: 0 }, 0, TODAY)).toHaveProperty('seatsTotal');
  });
  it('O2: a past date is rejected', () => {
    expect(validateEvent({ ...valid, date: '2026-10-31' }, 0, TODAY)).toHaveProperty('date');
  });
  it("today's date is allowed", () => {
    expect(validateEvent({ ...valid, date: TODAY }, 0, TODAY)).toEqual({});
  });
  it('O2: empty title is rejected', () => {
    expect(validateEvent({ ...valid, title: '   ' }, 0, TODAY)).toHaveProperty('title');
  });
  it('category must come from the fixed list', () => {
    expect(validateEvent({ ...valid, category: 'Party' }, 0, TODAY)).toHaveProperty('category');
  });
  it('O5: seats cannot drop below seats already taken', () => {
    expect(validateEvent({ ...valid, seatsTotal: 50 }, 81, TODAY)).toHaveProperty('seatsTotal');
  });
  it('O5: seats equal to seats taken is allowed', () => {
    expect(validateEvent({ ...valid, seatsTotal: 81 }, 81, TODAY)).toEqual({});
  });
});

describe('validateClub (rule 19, C1, C2)', () => {
  const photo = { name: 'Photography Club', category: 'Arts & Culture', description: 'Shoot and share.', managerName: 'Asha K' };

  it('C1: accepts a new unique club', () => {
    expect(validateClub(photo, clubs)).toEqual({});
  });
  it('C2: "dance club" clashes with "Dance Club" (case-insensitive)', () => {
    expect(validateClub({ ...photo, name: 'dance club' }, clubs)).toHaveProperty('name');
  });
  it('editing a club may keep its own name', () => {
    expect(validateClub({ ...photo, id: 'dance-club', name: 'Dance Club' }, clubs)).toEqual({});
  });
  it('C2: empty manager name is rejected', () => {
    expect(validateClub({ ...photo, managerName: '' }, clubs)).toHaveProperty('managerName');
  });
  it('category must be a club category', () => {
    expect(validateClub({ ...photo, category: 'Workshop' }, clubs)).toHaveProperty('category');
  });
});
