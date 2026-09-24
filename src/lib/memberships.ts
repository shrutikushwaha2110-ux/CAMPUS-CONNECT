// Club membership rules (SPEC §7 rules 10, 10a, 10b, 11)
// Joining is a REQUEST: it starts 'pending' and the club's Club Manager or faculty head approves or rejects it.
import type { AppClub, Membership } from '../data/types';
import { MAX_CLUBS_PER_STUDENT } from './constants';

// Pending and approved memberships hold one of the student's 2 slots; rejected ones don't (rule 10a).
// Only clubs that still exist count (a deleted club frees the slot, rule 20).
export const holdsSlot = (m: Membership) => m.status === 'pending' || m.status === 'approved';

export function clubsOf(userId: string, memberships: Membership[], liveClubIds: Set<string>): string[] {
  return memberships.filter(m => m.userId === userId && liveClubIds.has(m.clubId) && holdsSlot(m)).map(m => m.clubId);
}

export function membershipOf(userId: string, clubId: string, memberships: Membership[]): Membership | undefined {
  return memberships.find(m => m.userId === userId && m.clubId === clubId);
}

export type JoinBlock = 'login' | 'not-student' | 'already' | 'requested' | 'limit' | null;

export function joinBlockReason(args: {
  role: string | null;
  userId: string | null;
  clubId: string;
  memberships: Membership[];
  liveClubIds: Set<string>;
}): JoinBlock {
  const { role, userId, clubId, memberships, liveClubIds } = args;
  if (!role || !userId) return 'login';
  if (role !== 'student') return 'not-student';
  const existing = membershipOf(userId, clubId, memberships);
  if (existing?.status === 'approved') return 'already';
  if (existing?.status === 'pending') return 'requested';
  // a rejected request may be sent again (it doesn't hold a slot)
  if (clubsOf(userId, memberships, liveClubIds).length >= MAX_CLUBS_PER_STUDENT) return 'limit';
  return null;
}

export type ReviewMemberBlock = 'not-found' | 'not-pending' | null;

// Rule 10b: staff approve or reject a PENDING request (removing an approved member is a separate action)
export function reviewMemberBlock(m: Membership | undefined): ReviewMemberBlock {
  if (!m) return 'not-found';
  if (m.status !== 'pending') return 'not-pending';
  return null;
}

// Shown count = baseline members + APPROVED members who joined on this site (rule 10)
export function memberCount(club: AppClub, memberships: Membership[]): number {
  return club.memberCount + memberships.filter(m => m.clubId === club.id && m.status === 'approved').length;
}
