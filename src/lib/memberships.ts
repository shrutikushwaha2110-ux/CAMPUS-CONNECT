// Club membership rules (SPEC §7 rules 10, 10a, 11)
import type { AppClub, Membership } from '../data/types';
import { MAX_CLUBS_PER_STUDENT } from './constants';

// Only memberships of clubs that still exist count (a deleted club frees the slot, rule 20)
export function clubsOf(userId: string, memberships: Membership[], liveClubIds: Set<string>): string[] {
  return memberships.filter(m => m.userId === userId && liveClubIds.has(m.clubId)).map(m => m.clubId);
}

export type JoinBlock = 'login' | 'not-student' | 'already' | 'limit' | null;

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
  const mine = clubsOf(userId, memberships, liveClubIds);
  if (mine.includes(clubId)) return 'already';
  if (mine.length >= MAX_CLUBS_PER_STUDENT) return 'limit';
  return null;
}

// Shown count = baseline members + students who joined in this site (rule 10)
export function memberCount(club: AppClub, memberships: Membership[]): number {
  return club.memberCount + memberships.filter(m => m.clubId === club.id).length;
}
