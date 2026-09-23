import { useCallback, useMemo } from 'react';
import { useAppData } from '../state/AppData';

// Club memberships and followed units of the logged-in student
export function useMemberships() {
  const { memberships, follows, session, joinClub, leaveClub, followUnit, unfollowUnit } = useAppData();
  const joinedClubs = useMemo(
    () => (session ? memberships.filter(m => m.userId === session.userId).map(m => m.clubId) : []),
    [memberships, session],
  );
  const followedUnits = useMemo(
    () => (session ? follows.filter(f => f.userId === session.userId).map(f => f.unitId) : []),
    [follows, session],
  );
  const hasJoined = useCallback((clubId: string) => joinedClubs.includes(clubId), [joinedClubs]);
  const hasFollowed = useCallback((unitId: string) => followedUnits.includes(unitId), [followedUnits]);
  return { joinedClubs, followedUnits, hasJoined, hasFollowed, joinClub, leaveClub, followUnit, unfollowUnit };
}
