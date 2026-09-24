// One store for the whole app. The DATABASE (via the API in server/app.ts) is the source of truth:
// this loads /api/state (already filtered to what the logged-in role may see), and every action calls the API,
// which re-checks the rules, then reloads the state. Pages read it through the hooks in src/hooks.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppEvent, AppClub, AppUnit, User, Registration, Membership, Follow, Announcement, Session,
} from '../data/types';
import type { RegStatus, Role } from '../lib/constants';
import { makeId } from '../lib/ids';
import { findRegistration } from '../lib/registrations';
import { api } from './api';

interface ServerState {
  session: Session | null;
  currentUser: User | null;
  users: User[];
  events: AppEvent[];
  clubs: AppClub[];
  units: AppUnit[];
  announcements: Announcement[];
  registrations: Registration[];
  memberships: Membership[];
  follows: Follow[];
  seatCounts: Record<string, number>;
  memberCounts: Record<string, number>;
  openHeadClubs: string[];
}

export type ActionResult = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };
export interface SignupInput { name: string; email: string; password: string; confirm: string; role: Role; clubId?: string }

interface AppData extends ServerState {
  liveClubIds: Set<string>;
  // helpers
  localTaken: (eventId: string) => number; // site registrations holding a seat (all students)
  clubMemberCount: (club: AppClub) => number; // baseline + site members (rule 10)
  hostName: (e: { hostType: string; hostId: string }) => string;
  refresh: () => Promise<void>;
  // auth
  loginWith: (email: string, password: string, role: Role) => Promise<ActionResult>;
  signup: (input: SignupInput) => Promise<(ActionResult & { status?: 'approved' | 'pending' })>;
  logout: () => Promise<void>;
  // student actions
  register: (eventId: string) => Promise<Registration | string>;
  cancelRegistration: (eventId: string) => Promise<void>;
  joinClub: (clubId: string) => Promise<string | null>;
  leaveClub: (clubId: string) => Promise<void>;
  followUnit: (unitId: string) => Promise<void>;
  unfollowUnit: (unitId: string) => Promise<void>;
  // staff actions
  saveEvent: (event: AppEvent) => Promise<ActionResult>;
  cancelEvent: (eventId: string) => Promise<ActionResult>;
  reviewRegistration: (regId: string, status: RegStatus) => Promise<string | null>;
  saveClub: (club: AppClub) => Promise<ActionResult>;
  deleteClub: (clubId: string) => Promise<ActionResult>;
  saveAnnouncement: (a: { id?: string; title: string; body: string; clubId: string | null }) => Promise<ActionResult>;
  deleteAnnouncement: (id: string) => Promise<ActionResult>;
  saveUser: (u: User, password?: string) => Promise<ActionResult>;
  setUserActive: (userId: string, active: boolean) => Promise<ActionResult>;
  reviewSignup: (userId: string, decision: 'approve' | 'decline') => Promise<ActionResult>;
  newId: (label: string) => string;
}

const Ctx = createContext<AppData | null>(null);

const toResult = (r: { ok: boolean; error?: string; errors?: Record<string, string> }): ActionResult =>
  r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Something went wrong.', errors: r.errors };

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ServerState | null>(null);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    const r = await api<ServerState>('GET', '/state');
    if (r.ok && r.data) { setState(r.data); setLoadError(''); } else setLoadError(r.error ?? 'Could not load data.');
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // Every write: call the API, then reload what this role may see
  const run = useCallback(async (method: string, path: string, body?: unknown) => {
    const r = await api(method, path, body);
    await refresh();
    return r;
  }, [refresh]);

  const s = state;
  const liveClubIds = useMemo(() => new Set((s?.clubs ?? []).map(c => c.id)), [s]);
  const localTaken = useCallback((eventId: string) => s?.seatCounts[eventId] ?? 0, [s]);
  const clubMemberCount = useCallback((club: AppClub) => club.memberCount + (s?.memberCounts[club.id] ?? 0), [s]);
  const hostName = useCallback(
    (e: { hostType: string; hostId: string }) =>
      e.hostType === 'club' ? s?.clubs.find(c => c.id === e.hostId)?.name ?? 'a former club' : s?.units.find(u => u.id === e.hostId)?.name ?? e.hostId,
    [s],
  );

  const value: AppData | null = s && {
    ...s,
    liveClubIds, localTaken, clubMemberCount, hostName, refresh, newId: makeId,

    loginWith: async (email, password, role) => toResult(await run('POST', '/auth/login', { email, password, role })),
    signup: async input => {
      const r = await run('POST', '/auth/signup', input);
      return r.ok ? { ok: true, status: (r.data as { status: 'approved' | 'pending' }).status } : toResult(r);
    },
    logout: async () => { await run('POST', '/auth/logout'); },

    register: async eventId => {
      const r = await run('POST', `/events/${eventId}/registration`);
      return r.ok ? (r.data as { registration: Registration }).registration : r.error ?? 'error';
    },
    cancelRegistration: async eventId => { await run('DELETE', `/events/${eventId}/registration`); },
    joinClub: async clubId => {
      const r = await run('POST', `/clubs/${clubId}/membership`);
      return r.ok ? null : r.error ?? 'error';
    },
    leaveClub: async clubId => { await run('DELETE', `/clubs/${clubId}/membership`); },
    followUnit: async unitId => { await run('POST', `/units/${unitId}/follow`); },
    unfollowUnit: async unitId => { await run('DELETE', `/units/${unitId}/follow`); },

    saveEvent: async event => toResult(await run('PUT', `/events/${event.id}`, event)),
    cancelEvent: async eventId => toResult(await run('POST', `/events/${eventId}/cancel`)),
    reviewRegistration: async (regId, status) => {
      const r = await run('PATCH', `/registrations/${regId}`, { status });
      return r.ok ? null : r.error ?? 'error';
    },
    saveClub: async club => toResult(await run('PUT', `/clubs/${club.id}`, club)),
    deleteClub: async clubId => toResult(await run('DELETE', `/clubs/${clubId}`)),
    saveAnnouncement: async a => toResult(await run('PUT', `/announcements/${a.id ?? makeId(`ann-${a.title}`)}`, a)),
    deleteAnnouncement: async id => toResult(await run('DELETE', `/announcements/${id}`)),
    saveUser: async (u, password) => toResult(await run('PUT', `/users/${u.id}`, { ...u, password })),
    setUserActive: async (userId, active) => toResult(await run('PATCH', `/users/${userId}/active`, { active })),
    reviewSignup: async (userId, decision) => toResult(await run('POST', `/users/${userId}/review`, { decision })),
  };

  if (!value) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ backgroundColor: '#F7F7FC' }}>
        {loadError ? (
          <div role="alert" className="max-w-md">
            <p className="font-bold text-lg" style={{ color: '#1F1D2B' }}>CampusConnect can't load</p>
            <p className="text-sm mt-2" style={{ color: '#454242' }}>{loadError}</p>
            <button onClick={refresh} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary">Try again</button>
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#454242' }} role="status">Loading CampusConnect…</p>
        )}
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside <AppDataProvider>');
  return v;
}

export { findRegistration };
