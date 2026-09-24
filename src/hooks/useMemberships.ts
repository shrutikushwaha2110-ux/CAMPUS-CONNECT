import { useCallback, useMemo } from 'react';
import { useAppData } from '../state/AppData';
import type { MembershipStatus } from '../data/types';

// Club memberships and followed units of the logged-in student.
// joinedClubs = APPROVED only; requestedClubs = waiting for the club's staff (both use one of the 2 slots).
export function useMemberships() {
  const { memberships, follows, session, joinClub, leaveClub, followUnit, unfollowUnit } = useAppData();
  const mine = useMemo(() => (session ? memberships.filter(m => m.userId === session.userId) : []), [memberships, session]);
  const joinedClubs = useMemo(() => mine.filter(m => m.status === 'approved').map(m => m.clubId), [mine]);
  const requestedClubs = useMemo(() => mine.filter(m => m.status === 'pending').map(m => m.clubId), [mine]);
  const followedUnits = useMemo(
    () => (session ? follows.filter(f => f.userId === session.userId).map(f => f.unitId) : []),
    [follows, session],
  );
  const statusOf = useCallback((clubId: string): MembershipStatus | undefined => mine.find(m => m.clubId === clubId)?.status, [mine]);
  const hasJoined = useCallback((clubId: string) => joinedClubs.includes(clubId), [joinedClubs]);
  const hasFollowed = useCallback((unitId: string) => followedUnits.includes(unitId), [followedUnits]);
  return { joinedClubs, requestedClubs, followedUnits, statusOf, hasJoined, hasFollowed, joinClub, leaveClub, followUnit, unfollowUnit };
}
