import { describe, it, expect } from 'vitest';
import clubs from '../data/clubs.json';
import units from '../data/units.json';
import {
  canManageEvent, canViewClubAdmin, canManageClubs, canManageUsers, canManageAnnouncement, allowedHosts,
} from './permissions';

const danceMgr = { role: 'clubManager', clubId: 'dance-club' };
const faculty = { role: 'faculty' };
const student = { role: 'student' };

const danceEvent = { hostType: 'club', hostId: 'dance-club' };
const musicEvent = { hostType: 'club', hostId: 'music-club' };
const beyonderEvent = { hostType: 'unit', hostId: 'beyonder-studios' };

describe('canManageEvent (rule 12, O3/O4)', () => {
  it('Dance Club manager can manage own club event', () => {
    expect(canManageEvent(danceMgr, danceEvent)).toBe(true);
  });
  it('O4 club vs club: Dance Club manager cannot manage Music Club event', () => {
    expect(canManageEvent(danceMgr, musicEvent)).toBe(false);
  });
  it('O4 club vs unit: Dance Club manager cannot manage Beyonder Studios event', () => {
    expect(canManageEvent(danceMgr, beyonderEvent)).toBe(false);
  });
  it('O3 Faculty/Admin can manage any club event', () => {
    expect(canManageEvent(faculty, musicEvent)).toBe(true);
  });
  it('O3 Faculty/Admin can manage unit events', () => {
    expect(canManageEvent(faculty, beyonderEvent)).toBe(true);
  });
  it('students can never manage events (rule 17)', () => {
    expect(canManageEvent(student, danceEvent)).toBe(false);
  });
  it('logged-out visitors can never manage events', () => {
    expect(canManageEvent(null, danceEvent)).toBe(false);
  });
});

describe('canViewClubAdmin (M1: private club info)', () => {
  it('Dance manager sees Dance Club management info', () => {
    expect(canViewClubAdmin(danceMgr, 'dance-club')).toBe(true);
  });
  it('Dance manager cannot see Music Club management info', () => {
    expect(canViewClubAdmin(danceMgr, 'music-club')).toBe(false);
  });
  it('Faculty/Admin sees every club', () => {
    expect(canViewClubAdmin(faculty, 'music-club')).toBe(true);
  });
  it('students see no club admin info', () => {
    expect(canViewClubAdmin(student, 'dance-club')).toBe(false);
  });
});

describe('club and user administration (rule 18, C5, U1)', () => {
  it('Faculty/Admin can manage clubs and users', () => {
    expect(canManageClubs(faculty)).toBe(true);
    expect(canManageUsers(faculty)).toBe(true);
  });
  it('C5: Club Manager cannot manage clubs or users', () => {
    expect(canManageClubs(danceMgr)).toBe(false);
    expect(canManageUsers(danceMgr)).toBe(false);
  });
  it('students cannot manage clubs', () => {
    expect(canManageClubs(student)).toBe(false);
  });
});

describe('canManageAnnouncement (M5, A-rules)', () => {
  it('Dance manager can edit Dance Club announcements', () => {
    expect(canManageAnnouncement(danceMgr, { clubId: 'dance-club' })).toBe(true);
  });
  it('Dance manager cannot edit Music Club announcements', () => {
    expect(canManageAnnouncement(danceMgr, { clubId: 'music-club' })).toBe(false);
  });
  it('Dance manager cannot edit university-wide announcements', () => {
    expect(canManageAnnouncement(danceMgr, { clubId: null })).toBe(false);
  });
  it('Faculty/Admin can edit any announcement', () => {
    expect(canManageAnnouncement(faculty, { clubId: null })).toBe(true);
    expect(canManageAnnouncement(faculty, { clubId: 'music-club' })).toBe(true);
  });
});

describe('allowedHosts (rule 13)', () => {
  it('Club Manager can only host as their own club', () => {
    expect(allowedHosts(danceMgr, clubs, units)).toEqual([{ type: 'club', id: 'dance-club', name: 'Dance Club' }]);
  });
  it('Faculty/Admin can host as any club or any unit', () => {
    expect(allowedHosts(faculty, clubs, units)).toHaveLength(clubs.length + units.length);
  });
  it('Student has no hosts', () => {
    expect(allowedHosts(student, clubs, units)).toEqual([]);
  });
});
