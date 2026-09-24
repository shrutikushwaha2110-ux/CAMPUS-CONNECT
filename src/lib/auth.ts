// Login rules (SPEC A1, SU1–SU3). Pure: the password itself is checked on the server (server/passwords.ts);
// these decide whether an account whose password matched may sign in on this role's login page.
// Club Managers AND Faculty are tied to one club (faculty = the club's head); that club must still exist.
import type { User, Session } from '../data/types';
import type { Role } from './constants';

export type LoginResult = { ok: true; session: Session } | { ok: false; error: string };

const needsClub = (role: Role) => role === 'clubManager' || role === 'faculty';
const roleName = (role: Role) => (role === 'clubManager' ? 'Club Manager' : role === 'faculty' ? 'Faculty/Admin' : 'Student');

export const BAD_LOGIN = 'Email or password is incorrect.';

// Call only after the password has been verified
export function loginDecision(user: User, role: Role, liveClubIds: Set<string>): LoginResult {
  if (user.status === 'pending') return { ok: false, error: 'Your account is waiting for approval by a faculty member.' };
  if (user.status === 'declined') return { ok: false, error: 'Your sign-up request was declined. Contact the Faculty/Admin office.' };
  if (!user.active) return { ok: false, error: 'This account has been deactivated. Contact your faculty head.' };
  if (user.role !== role) return { ok: false, error: `This account is not a ${roleName(role)} account. Use the login page for your role.` };
  if (needsClub(role)) {
    if (!user.clubId || !liveClubIds.has(user.clubId)) return { ok: false, error: 'Your account is not assigned to an active club. Contact the Faculty/Admin office.' };
    return { ok: true, session: { userId: user.id, role, clubId: user.clubId } };
  }
  return { ok: true, session: { userId: user.id, role } };
}

// A stored session is only trusted if its user still exists, is approved + active, and still has that role/club
export function validateSession(session: Session | null, users: User[], liveClubIds: Set<string>): Session | null {
  if (!session?.userId) return null;
  const user = users.find(u => u.id === session.userId);
  if (!user || !user.active || user.status !== 'approved' || user.role !== session.role) return null;
  if (needsClub(user.role)) {
    if (!user.clubId || !liveClubIds.has(user.clubId)) return null;
    return { userId: user.id, role: user.role, clubId: user.clubId };
  }
  return { userId: user.id, role: user.role };
}
