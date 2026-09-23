import { describe, it, expect } from 'vitest';
import clubs from '../data/clubs.json';
import type { AppClub, Membership } from '../data/types';
import { joinBlockReason, memberCount, clubsOf } from './memberships';

const live = new Set(clubs.map(c => c.id));
const m = (userId: string, clubId: string): Membership => ({ userId, clubId, joinedAt: '2026-11-01T10:00:00Z' });
const join = (clubId: string, memberships: Membership[], role: string | null = 'student', userId: string | null = 'stu-shruti', liveIds = live) =>
  joinBlockReason({ role, userId, clubId, memberships, liveClubIds: liveIds });

describe('2-club limit (rule 10a, F9a)', () => {
  it('a student with no clubs can join', () => {
    expect(join('dance-club', [])).toBeNull();
  });
  it('a student with 1 club can join a second', () => {
    expect(join('music-club', [m('stu-shruti', 'dance-club')])).toBeNull();
  });
  it('a student with 2 clubs is blocked from a third', () => {
    expect(join('sports-club', [m('stu-shruti', 'dance-club'), m('stu-shruti', 'music-club')])).toBe('limit');
  });
  it("other students' memberships don't count toward my limit", () => {
    expect(join('sports-club', [m('stu-raju', 'dance-club'), m('stu-raju', 'music-club')])).toBeNull();
  });
  it('a club deleted by faculty frees the slot (rule 20)', () => {
    const withoutDance = new Set([...live].filter(id => id !== 'dance-club'));
    expect(join('sports-club', [m('stu-shruti', 'dance-club'), m('stu-shruti', 'music-club')], 'student', 'stu-shruti', withoutDance)).toBeNull();
  });
  it('rule 10: cannot join the same club twice', () => {
    expect(join('dance-club', [m('stu-shruti', 'dance-club')])).toBe('already');
  });
  it('staff and logged-out visitors cannot join', () => {
    expect(join('dance-club', [], 'clubManager', 'mgr-dance')).toBe('not-student');
    expect(join('dance-club', [], null, null)).toBe('login');
  });
});

describe('member count (rules 10, 11)', () => {
  const dance = clubs[0] as AppClub;
  it('baseline plus site members', () => {
    expect(memberCount(dance, [m('a', 'dance-club'), m('b', 'dance-club'), m('c', 'music-club')])).toBe(130);
  });
  it('clubsOf lists only live clubs for that user', () => {
    expect(clubsOf('stu-shruti', [m('stu-shruti', 'dance-club'), m('stu-shruti', 'gone-club')], live)).toEqual(['dance-club']);
  });
});
