import { describe, it, expect } from 'vitest';
import seed from '../data/users.json';
import clubs from '../data/clubs.json';
import type { User } from '../data/types';
import { loginDecision, validateSession } from './auth';

// Seed users as the server stores them (approved, no password)
const all: User[] = seed.map(({ password: _p, ...u }) => ({ ...u, status: 'approved' }) as User);
const live = new Set(clubs.map(c => c.id));
const byId = (id: string) => all.find(u => u.id === id)!;

describe('who may log in on which page (A1, SU2)', () => {
  it('student on the student page', () => {
    expect(loginDecision(byId('stu-shruti'), 'student', live)).toEqual({ ok: true, session: { userId: 'stu-shruti', role: 'student' } });
  });
  it('club manager session carries their club', () => {
    expect(loginDecision(byId('mgr-dance'), 'clubManager', live)).toEqual({ ok: true, session: { userId: 'mgr-dance', role: 'clubManager', clubId: 'dance-club' } });
  });
  it('faculty session carries the club they head', () => {
    expect(loginDecision(byId('fac-admin'), 'faculty', live)).toEqual({ ok: true, session: { userId: 'fac-admin', role: 'faculty', clubId: 'dance-club' } });
  });
  it('an account cannot use another role’s login page', () => {
    expect(loginDecision(byId('stu-shruti'), 'faculty', live).ok).toBe(false);
  });
  it('SU2: a pending sign-up cannot log in yet', () => {
    const r = loginDecision({ ...byId('stu-raju'), role: 'clubManager', clubId: 'dance-club', status: 'pending' }, 'clubManager', live);
    expect(r).toEqual({ ok: false, error: 'Your account is waiting for approval by a faculty member.' });
  });
  it('SU3: a declined sign-up cannot log in', () => {
    expect(loginDecision({ ...byId('stu-raju'), status: 'declined' }, 'student', live).ok).toBe(false);
  });
  it('U2: a deactivated account cannot log in', () => {
    expect(loginDecision({ ...byId('stu-raju'), active: false }, 'student', live).ok).toBe(false);
  });
  it('manager / faculty whose club was deleted cannot log in', () => {
    const noMusic = new Set([...live].filter(id => id !== 'music-club'));
    expect(loginDecision(byId('mgr-music'), 'clubManager', noMusic).ok).toBe(false);
    expect(loginDecision(byId('fac-music'), 'faculty', noMusic).ok).toBe(false);
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
  it('drops a session whose user is not approved', () => {
    const pend = all.map(u => (u.id === 'stu-shruti' ? { ...u, status: 'pending' as const } : u));
    expect(validateSession({ userId: 'stu-shruti', role: 'student' }, pend, live)).toBeNull();
  });
  it('drops malformed sessions with no userId', () => {
    expect(validateSession({ role: 'student' } as never, all, live)).toBeNull();
  });
});
