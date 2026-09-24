import { describe, it, expect } from 'vitest';
import clubs from '../data/clubs.json';
import units from '../data/units.json';
import {
  canManageEvent, canViewClubAdmin, canEditClub, canDeleteClub, canAddClub, canManageUsers,
  canManageAnnouncement, canEditUser, canDeactivateUser, assignableClubs, allowedHosts,
} from './permissions';

const danceMgr = { role: 'clubManager', clubId: 'dance-club', userId: 'mgr-dance' };
const danceHead = { role: 'faculty', clubId: 'dance-club', userId: 'fac-admin' };
const student = { role: 'student', userId: 'stu-shruti' };

const danceEvent = { hostType: 'club', hostId: 'dance-club' };
const musicEvent = { hostType: 'club', hostId: 'music-club' };
const unitEvent = { hostType: 'unit', hostId: 'beyonder-studios' };

describe('canManageEvent (rule 12, O3/O4)', () => {
  it('Dance manager manages Dance events only', () => {
    expect(canManageEvent(danceMgr, danceEvent)).toBe(true);
    expect(canManageEvent(danceMgr, musicEvent)).toBe(false);
    expect(canManageEvent(danceMgr, unitEvent)).toBe(false);
  });
  it('Dance faculty head manages Dance events, NOT Music events', () => {
    expect(canManageEvent(danceHead, danceEvent)).toBe(true);
    expect(canManageEvent(danceHead, musicEvent)).toBe(false);
  });
  it('any faculty manages university/unit events', () => {
    expect(canManageEvent(danceHead, unitEvent)).toBe(true);
  });
  it('students and visitors manage nothing', () => {
    expect(canManageEvent(student, danceEvent)).toBe(false);
    expect(canManageEvent(null, unitEvent)).toBe(false);
  });
});

describe('club access (M1, rule 18, C3–C5)', () => {
  it('staff see only their own club admin view', () => {
    expect(canViewClubAdmin(danceMgr, 'dance-club')).toBe(true);
    expect(canViewClubAdmin(danceHead, 'dance-club')).toBe(true);
    expect(canViewClubAdmin(danceHead, 'music-club')).toBe(false);
    expect(canViewClubAdmin(student, 'dance-club')).toBe(false);
  });
  it('faculty edit/delete only the club they head', () => {
    expect(canEditClub(danceHead, 'dance-club')).toBe(true);
    expect(canEditClub(danceHead, 'music-club')).toBe(false);
    expect(canDeleteClub(danceHead, 'music-club')).toBe(false);
  });
  it('club managers cannot edit or delete clubs', () => {
    expect(canEditClub(danceMgr, 'dance-club')).toBe(false);
  });
  it('any faculty may add a club and manage users; managers may not', () => {
    expect(canAddClub(danceHead)).toBe(true);
    expect(canManageUsers(danceHead)).toBe(true);
    expect(canAddClub(danceMgr)).toBe(false);
    expect(canManageUsers(danceMgr)).toBe(false);
  });
});

describe('announcements (rule 25)', () => {
  it('own club only for managers and faculty', () => {
    expect(canManageAnnouncement(danceMgr, { clubId: 'dance-club' })).toBe(true);
    expect(canManageAnnouncement(danceMgr, { clubId: 'music-club' })).toBe(false);
    expect(canManageAnnouncement(danceHead, { clubId: 'music-club' })).toBe(false);
  });
  it('university-wide only for faculty', () => {
    expect(canManageAnnouncement(danceHead, { clubId: null })).toBe(true);
    expect(canManageAnnouncement(danceMgr, { clubId: null })).toBe(false);
  });
});

describe('user management (rule 26, U1–U3)', () => {
  it('faculty can edit and deactivate students', () => {
    expect(canDeactivateUser(danceHead, { id: 'stu-raju', role: 'student' })).toBe(true);
  });
  it('faculty can deactivate their own club’s manager only', () => {
    expect(canDeactivateUser(danceHead, { id: 'mgr-dance', role: 'clubManager', clubId: 'dance-club' })).toBe(true);
    expect(canDeactivateUser(danceHead, { id: 'mgr-music', role: 'clubManager', clubId: 'music-club' })).toBe(false);
  });
  it('U3: faculty can never edit or deactivate another faculty member', () => {
    expect(canEditUser(danceHead, { id: 'fac-vikram', role: 'faculty', clubId: 'hackathon-club' })).toBe(false);
    expect(canDeactivateUser(danceHead, { id: 'fac-vikram', role: 'faculty', clubId: 'hackathon-club' })).toBe(false);
  });
  it('faculty can edit their own profile but not deactivate themselves', () => {
    expect(canEditUser(danceHead, { id: 'fac-admin', role: 'faculty', clubId: 'dance-club' })).toBe(true);
    expect(canDeactivateUser(danceHead, { id: 'fac-admin', role: 'faculty', clubId: 'dance-club' })).toBe(false);
  });
  it('new club managers can only be assigned to the faculty member’s own club', () => {
    expect(assignableClubs(danceHead, 'clubManager', clubs, []).map(c => c.id)).toEqual(['dance-club']);
  });
  it('a new faculty head can only get a club without an active head', () => {
    const users = [{ id: 'fac-admin', role: 'faculty', clubId: 'dance-club', active: true }];
    const ids = assignableClubs(danceHead, 'faculty', clubs, users).map(c => c.id);
    expect(ids).not.toContain('dance-club');
    expect(ids).toContain('music-club');
  });
});

describe('allowedHosts (rule 13)', () => {
  it('Club Manager: own club only', () => {
    expect(allowedHosts(danceMgr, clubs, units)).toEqual([{ type: 'club', id: 'dance-club', name: 'Dance Club' }]);
  });
  it('Faculty: own club + every unit, no other clubs', () => {
    const hosts = allowedHosts(danceHead, clubs, units);
    expect(hosts.filter(h => h.type === 'club').map(h => h.id)).toEqual(['dance-club']);
    expect(hosts.filter(h => h.type === 'unit')).toHaveLength(units.length);
  });
  it('Student has no hosts', () => {
    expect(allowedHosts(student, clubs, units)).toEqual([]);
  });
});
