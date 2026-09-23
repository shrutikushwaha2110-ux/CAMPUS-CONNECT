// One store for the whole app: seed JSON + localStorage changes, merged (SPEC §6).
// Pages read from here via hooks in src/hooks; every rule it applies comes from src/lib.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import seedEvents from '../data/events.json';
import seedClubs from '../data/clubs.json';
import seedUnits from '../data/units.json';
import seedUsers from '../data/users.json';
import seedAnnouncements from '../data/announcements.json';
import type {
  AppEvent, AppClub, AppUnit, User, Registration, Membership, Follow, Announcement, Session,
} from '../data/types';
import { KEYS, read, write, readList, clearLegacy } from '../lib/storage';
import { mergeById, withChange, makeId, type Changes } from '../lib/merge';
import { getToday } from '../lib/date';
import { validateSession } from '../lib/auth';
import { initialStatus, localActiveCount, registerBlockReason, reviewBlockReason, findRegistration } from '../lib/registrations';
import { joinBlockReason } from '../lib/memberships';
import { eventsToCancelOnDelete } from '../lib/clubs';
import type { RegStatus } from '../lib/constants';

interface AppData {
  // data
  session: Session | null;
  currentUser: User | null;
  users: User[];
  events: AppEvent[];
  clubs: AppClub[];
  units: AppUnit[];
  registrations: Registration[];
  memberships: Membership[];
  follows: Follow[];
  announcements: Announcement[];
  liveClubIds: Set<string>;
  // helpers
  localTaken: (eventId: string) => number;
  hostName: (e: { hostType: string; hostId: string }) => string;
  // session
  login: (s: Session) => void;
  logout: () => void;
  // student actions
  register: (eventId: string) => Registration | string;
  cancelRegistration: (eventId: string) => void;
  joinClub: (clubId: string) => string | null;
  leaveClub: (clubId: string) => void;
  followUnit: (unitId: string) => void;
  unfollowUnit: (unitId: string) => void;
  // staff actions
  saveEvent: (event: AppEvent) => void;
  cancelEvent: (eventId: string) => void;
  reviewRegistration: (regId: string, status: RegStatus) => string | null;
  saveClub: (club: AppClub) => void;
  deleteClub: (clubId: string) => void;
  saveAnnouncement: (a: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'authorId'> & { id?: string }) => void;
  deleteAnnouncement: (id: string) => void;
  saveUser: (u: User) => void;
  newId: (label: string) => string;
}

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  useEffect(() => clearLegacy(), []);

  const [eventChanges, setEventChanges] = useState<Changes<AppEvent>>(() => read(KEYS.EVENT_CHANGES, {}));
  const [clubChanges, setClubChanges] = useState<Changes<AppClub>>(() => read(KEYS.CLUB_CHANGES, {}));
  const [userChanges, setUserChanges] = useState<Changes<User>>(() => read(KEYS.USER_CHANGES, {}));
  const [annChanges, setAnnChanges] = useState<Changes<Announcement>>(() => read(KEYS.ANNOUNCEMENT_CHANGES, {}));
  const [registrations, setRegistrations] = useState<Registration[]>(() => readList(KEYS.REGISTRATIONS));
  const [memberships, setMemberships] = useState<Membership[]>(() => readList(KEYS.MEMBERSHIPS));
  const [follows, setFollows] = useState<Follow[]>(() => readList(KEYS.FOLLOWS));
  const [rawSession, setRawSession] = useState<Session | null>(() => read(KEYS.SESSION, null));

  // Persist every slice when it changes
  useEffect(() => write(KEYS.EVENT_CHANGES, eventChanges), [eventChanges]);
  useEffect(() => write(KEYS.CLUB_CHANGES, clubChanges), [clubChanges]);
  useEffect(() => write(KEYS.USER_CHANGES, userChanges), [userChanges]);
  useEffect(() => write(KEYS.ANNOUNCEMENT_CHANGES, annChanges), [annChanges]);
  useEffect(() => write(KEYS.REGISTRATIONS, registrations), [registrations]);
  useEffect(() => write(KEYS.MEMBERSHIPS, memberships), [memberships]);
  useEffect(() => write(KEYS.FOLLOWS, follows), [follows]);
  useEffect(() => write(KEYS.SESSION, rawSession), [rawSession]);

  const events = useMemo(() => mergeById(seedEvents as AppEvent[], eventChanges), [eventChanges]);
  const clubs = useMemo(() => mergeById(seedClubs as AppClub[], clubChanges), [clubChanges]);
  const users = useMemo(() => mergeById(seedUsers as User[], userChanges), [userChanges]);
  const announcements = useMemo(
    () => mergeById(seedAnnouncements as Announcement[], annChanges).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [annChanges],
  );
  const units = seedUnits as AppUnit[];
  const liveClubIds = useMemo(() => new Set(clubs.map(c => c.id)), [clubs]);

  // Rule 20 / F17: memberships and announcements of deleted clubs are hidden everywhere
  const liveMemberships = useMemo(() => memberships.filter(m => liveClubIds.has(m.clubId)), [memberships, liveClubIds]);
  const liveAnnouncements = useMemo(
    () => announcements.filter(a => a.clubId === null || liveClubIds.has(a.clubId)),
    [announcements, liveClubIds],
  );

  // A stored session is re-checked against current users (deactivated / reassigned / club deleted)
  const session = useMemo(() => validateSession(rawSession, users, liveClubIds), [rawSession, users, liveClubIds]);
  const currentUser = useMemo(() => users.find(u => u.id === session?.userId) ?? null, [users, session]);

  const localTaken = useCallback((eventId: string) => localActiveCount(eventId, registrations), [registrations]);
  const hostName = useCallback(
    (e: { hostType: string; hostId: string }) =>
      e.hostType === 'club'
        ? clubs.find(c => c.id === e.hostId)?.name ?? (seedClubs.find(c => c.id === e.hostId)?.name ?? e.hostId)
        : units.find(u => u.id === e.hostId)?.name ?? e.hostId,
    [clubs, units],
  );

  const login = useCallback((s: Session) => setRawSession(s), []);
  const logout = useCallback(() => setRawSession(null), []);

  const register = useCallback((eventId: string): Registration | string => {
    const event = events.find(e => e.id === eventId);
    if (!event) return 'not-found';
    const block = registerBlockReason({
      event, role: session?.role ?? null, userId: session?.userId ?? null, regs: registrations, today: getToday(),
    });
    if (block) return block;
    const reg: Registration = {
      id: makeId(`reg-${eventId}`), eventId, userId: session!.userId, status: initialStatus(event), createdAt: new Date().toISOString(),
    };
    setRegistrations(prev => [...prev, reg]);
    return reg;
  }, [events, registrations, session]);

  // Rule 5: cancelling removes the registration and gives the seat back
  const cancelRegistration = useCallback((eventId: string) => {
    if (!session) return;
    setRegistrations(prev => prev.filter(r => !(r.eventId === eventId && r.userId === session.userId)));
  }, [session]);

  const joinClub = useCallback((clubId: string) => {
    const block = joinBlockReason({
      role: session?.role ?? null, userId: session?.userId ?? null, clubId, memberships: liveMemberships, liveClubIds,
    });
    if (block) return block;
    setMemberships(prev => [...prev, { userId: session!.userId, clubId, joinedAt: new Date().toISOString() }]);
    return null;
  }, [session, liveMemberships, liveClubIds]);

  const leaveClub = useCallback((clubId: string) => {
    if (!session) return;
    setMemberships(prev => prev.filter(m => !(m.userId === session.userId && m.clubId === clubId)));
  }, [session]);

  const followUnit = useCallback((unitId: string) => {
    if (!session || session.role !== 'student') return;
    setFollows(prev => (prev.some(f => f.userId === session.userId && f.unitId === unitId) ? prev : [...prev, { userId: session.userId, unitId }]));
  }, [session]);

  const unfollowUnit = useCallback((unitId: string) => {
    if (!session) return;
    setFollows(prev => prev.filter(f => !(f.userId === session.userId && f.unitId === unitId)));
  }, [session]);

  const saveEvent = useCallback((event: AppEvent) => {
    setEventChanges(prev => withChange(prev, event.id, event));
  }, []);

  // Rule 16: cancelled, never deleted, so registered students still see it
  const cancelEvent = useCallback((eventId: string) => {
    setEventChanges(prev => withChange(prev, eventId, { status: 'cancelled' }));
  }, []);

  const reviewRegistration = useCallback((regId: string, status: RegStatus) => {
    const reg = registrations.find(r => r.id === regId);
    const event = reg && events.find(e => e.id === reg.eventId);
    if (!reg || !event) return 'not-found';
    const block = reviewBlockReason(event, reg, status, registrations);
    if (block) return block;
    setRegistrations(prev => prev.map(r => (r.id === regId ? { ...r, status } : r)));
    return null;
  }, [registrations, events]);

  const saveClub = useCallback((club: AppClub) => {
    setClubChanges(prev => withChange(prev, club.id, club));
  }, []);

  // Rule 20: mark deleted, cancel upcoming events, drop memberships
  const deleteClub = useCallback((clubId: string) => {
    const toCancel = eventsToCancelOnDelete(clubId, events, getToday());
    setClubChanges(prev => withChange(prev, clubId, { _deleted: true }));
    setEventChanges(prev => toCancel.reduce((acc, id) => withChange(acc, id, { status: 'cancelled' }), prev));
    setMemberships(prev => prev.filter(m => m.clubId !== clubId));
  }, [events]);

  const saveAnnouncement = useCallback((a: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'authorId'> & { id?: string }) => {
    const now = new Date().toISOString();
    setAnnChanges(prev => {
      if (a.id) return withChange(prev, a.id, { title: a.title, body: a.body, clubId: a.clubId, updatedAt: now });
      const id = makeId(`ann-${a.title}`);
      return withChange(prev, id, { ...a, id, authorId: session?.userId ?? 'unknown', createdAt: now, updatedAt: now });
    });
  }, [session]);

  const deleteAnnouncement = useCallback((id: string) => {
    setAnnChanges(prev => withChange(prev, id, { _deleted: true }));
  }, []);

  const saveUser = useCallback((u: User) => {
    setUserChanges(prev => withChange(prev, u.id, u));
  }, []);

  const value: AppData = {
    session, currentUser, users, events, clubs, units, registrations,
    memberships: liveMemberships, follows, announcements: liveAnnouncements, liveClubIds,
    localTaken, hostName, login, logout,
    register, cancelRegistration, joinClub, leaveClub, followUnit, unfollowUnit,
    saveEvent, cancelEvent, reviewRegistration, saveClub, deleteClub, saveAnnouncement, deleteAnnouncement, saveUser,
    newId: makeId,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside <AppDataProvider>');
  return v;
}

export { findRegistration };
