// Demo login (SPEC A1). Front-end only: this is NOT real security, passwords are demo values in the repo.
// Each role has its own login page, so an account can only sign in on the page for its role.
// Club Managers AND Faculty are tied to one club (faculty = the club's head); that club must still exist.
import type { User, Session } from '../data/types';
import type { Role } from './constants';

export type LoginResult = { ok: true; session: Session } | { ok: false; error: string };

const needsClub = (role: Role) => role === 'clubManager' || role === 'faculty';

export function authenticate(
  email: string,
  password: string,
  role: Role,
  users: User[],
  liveClubIds: Set<string>,
): LoginResult {
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) return { ok: false, error: 'Email or password is incorrect.' };
  if (!user.active) return { ok: false, error: 'This account has been deactivated. Contact your faculty head.' };
  if (user.role !== role) return { ok: false, error: `This account is not a ${role === 'clubManager' ? 'Club Manager' : role === 'faculty' ? 'Faculty/Admin' : 'Student'} account. Use the login page for your role.` };
  if (needsClub(role)) {
    if (!user.clubId || !liveClubIds.has(user.clubId)) return { ok: false, error: 'Your account is not assigned to an active club. Contact the Faculty/Admin office.' };
    return { ok: true, session: { userId: user.id, role, clubId: user.clubId } };
  }
  return { ok: true, session: { userId: user.id, role } };
}

// A saved session is only trusted if its user still exists, is active, and still has that role/club
export function validateSession(session: Session | null, users: User[], liveClubIds: Set<string>): Session | null {
  if (!session?.userId) return null;
  const user = users.find(u => u.id === session.userId);
  if (!user || !user.active || user.role !== session.role) return null;
  if (needsClub(user.role)) {
    if (!user.clubId || !liveClubIds.has(user.clubId)) return null;
    return { userId: user.id, role: user.role, clubId: user.clubId };
  }
  return { userId: user.id, role: user.role };
}
