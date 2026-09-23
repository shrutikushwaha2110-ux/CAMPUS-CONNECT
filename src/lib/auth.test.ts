import { describe, it, expect } from 'vitest';
import users from '../data/users.json';
import clubs from '../data/clubs.json';
import type { User } from '../data/types';
import { authenticate, validateSession } from './auth';

const all = users as User[];
const live = new Set(clubs.map(c => c.id));

describe('separate role logins (A1)', () => {
  it('student logs in on the student page', () => {
    expect(authenticate('shruti@student.atria.edu', 'demo123', 'student', all, live))
      .toEqual({ ok: true, session: { userId: 'stu-shruti', role: 'student' } });
  });
  it('club manager session carries their club', () => {
    expect(authenticate('dance.manager@atria.edu', 'demo123', 'clubManager', all, live))
      .toEqual({ ok: true, session: { userId: 'mgr-dance', role: 'clubManager', clubId: 'dance-club' } });
  });
  it('faculty/admin logs in', () => {
    expect(authenticate('ADMIN@atria.edu', 'admin123', 'faculty', all, live).ok).toBe(true);
  });
  it('wrong password is rejected', () => {
    expect(authenticate('admin@atria.edu', 'nope', 'faculty', all, live).ok).toBe(false);
  });
  it('a student account cannot use the faculty login page', () => {
    const r = authenticate('shruti@student.atria.edu', 'demo123', 'faculty', all, live);
    expect(r.ok).toBe(false);
  });
  it('a deactivated account cannot log in (U2)', () => {
    const off = all.map(u => (u.id === 'stu-raju' ? { ...u, active: false } : u));
    expect(authenticate('raju@student.atria.edu', 'demo123', 'student', off, live).ok).toBe(false);
  });
  it('a manager whose club was deleted cannot log in', () => {
    const noDance = new Set([...live].filter(id => id !== 'dance-club'));
    expect(authenticate('dance.manager@atria.edu', 'demo123', 'clubManager', all, noDance).ok).toBe(false);
  });
});

describe('validateSession', () => {
  it('keeps a valid session and refreshes the club from the user record', () => {
    const moved = all.map(u => (u.id === 'mgr-dance' ? { ...u, clubId: 'music-club' } : u));
    expect(validateSession({ userId: 'mgr-dance', role: 'clubManager', clubId: 'dance-club' }, moved, live))
      .toEqual({ userId: 'mgr-dance', role: 'clubManager', clubId: 'music-club' });
  });
  it('drops a session whose user was deactivated', () => {
    const off = all.map(u => (u.id === 'stu-shruti' ? { ...u, active: false } : u));
    expect(validateSession({ userId: 'stu-shruti', role: 'student' }, off, live)).toBeNull();
  });
  it('drops old-format sessions with no userId', () => {
    expect(validateSession({ role: 'student' } as never, all, live)).toBeNull();
  });
});
