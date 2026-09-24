import { describe, it, expect } from 'vitest';
import clubs from '../data/clubs.json';
import type { AppClub, Membership, MembershipStatus } from '../data/types';
import { joinBlockReason, memberCount, clubsOf, reviewMemberBlock } from './memberships';
import { canManageMembers } from './permissions';

const live = new Set(clubs.map(c => c.id));
const m = (userId: string, clubId: string, status: MembershipStatus = 'approved'): Membership =>
  ({ userId, clubId, status, joinedAt: '2026-11-01T10:00:00Z' });
const join = (clubId: string, memberships: Membership[], role: string | null = 'student', userId: string | null = 'stu-shruti', liveIds = live) =>
  joinBlockReason({ role, userId, clubId, memberships, liveClubIds: liveIds });

describe('join requests + 2-club limit (rules 10, 10a, F9a, F9b)', () => {
  it('a student with no clubs can request to join', () => {
    expect(join('dance-club', [])).toBeNull();
  });
  it('a pending request blocks a second request to the same club', () => {
    expect(join('dance-club', [m('stu-shruti', 'dance-club', 'pending')])).toBe('requested');
  });
  it('an approved member cannot join again', () => {
    expect(join('dance-club', [m('stu-shruti', 'dance-club')])).toBe('already');
  });
  it('pending requests count toward the 2-club limit', () => {
    expect(join('sports-club', [m('stu-shruti', 'dance-club', 'pending'), m('stu-shruti', 'music-club', 'pending')])).toBe('limit');
    expect(join('sports-club', [m('stu-shruti', 'dance-club'), m('stu-shruti', 'music-club', 'pending')])).toBe('limit');
  });
  it('a rejected request frees the slot and may be sent again', () => {
    expect(join('dance-club', [m('stu-shruti', 'dance-club', 'rejected'), m('stu-shruti', 'music-club')])).toBeNull();
  });
  it("other students' memberships don't count toward my limit", () => {
    expect(join('sports-club', [m('stu-raju', 'dance-club'), m('stu-raju', 'music-club')])).toBeNull();
  });
  it('a club deleted by faculty frees the slot (rule 20)', () => {
    const withoutDance = new Set([...live].filter(id => id !== 'dance-club'));
    expect(join('sports-club', [m('stu-shruti', 'dance-club'), m('stu-shruti', 'music-club')], 'student', 'stu-shruti', withoutDance)).toBeNull();
  });
  it('staff and logged-out visitors cannot join', () => {
    expect(join('dance-club', [], 'clubManager', 'mgr-dance')).toBe('not-student');
    expect(join('dance-club', [], null, null)).toBe('login');
  });
});

describe('reviewing join requests (rule 10b, M8)', () => {
  it('only pending requests can be approved / rejected', () => {
    expect(reviewMemberBlock(m('a', 'dance-club', 'pending'))).toBeNull();
    expect(reviewMemberBlock(m('a', 'dance-club', 'approved'))).toBe('not-pending');
    expect(reviewMemberBlock(undefined)).toBe('not-found');
  });
  it('the club’s manager and faculty head manage its members; nobody else', () => {
    expect(canManageMembers({ role: 'clubManager', clubId: 'dance-club' }, 'dance-club')).toBe(true);
    expect(canManageMembers({ role: 'faculty', clubId: 'dance-club' }, 'dance-club')).toBe(true);
    expect(canManageMembers({ role: 'clubManager', clubId: 'music-club' }, 'dance-club')).toBe(false);
    expect(canManageMembers({ role: 'faculty', clubId: 'music-club' }, 'dance-club')).toBe(false);
    expect(canManageMembers({ role: 'student' }, 'dance-club')).toBe(false);
  });
});

describe('member count (rules 10, 11)', () => {
  const dance = clubs[0] as AppClub;
  it('baseline plus APPROVED site members only', () => {
    expect(memberCount(dance, [m('a', 'dance-club'), m('b', 'dance-club'), m('c', 'dance-club', 'pending'), m('d', 'music-club')])).toBe(130);
  });
  it('clubsOf lists live clubs whose membership holds a slot', () => {
    expect(clubsOf('stu-shruti', [m('stu-shruti', 'dance-club'), m('stu-shruti', 'music-club', 'rejected'), m('stu-shruti', 'gone-club')], live)).toEqual(['dance-club']);
  });
});
