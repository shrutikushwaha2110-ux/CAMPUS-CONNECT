// Who may manage what (SPEC §7 rules 12, 13, 17, 18, 25, 26)
// Club Manager: only their own club.
// Faculty: head of ONE club (their clubId) + university/unit events + university-wide announcements.
//          They may add new clubs and manage student / own-club accounts, but never another faculty member's account.

export interface Actor {
  role: string;
  clubId?: string;
  userId?: string;
}

export const isFaculty = (a: Actor | null | undefined) => a?.role === 'faculty';
export const isClubManager = (a: Actor | null | undefined) => a?.role === 'clubManager';
export const isStaff = (a: Actor | null | undefined) => isFaculty(a) || isClubManager(a);

export function canManageEvent(actor: Actor | null | undefined, event: { hostType: string; hostId: string }): boolean {
  if (!actor) return false;
  if (event.hostType === 'club') return isStaff(actor) && event.hostId === actor.clubId;
  // Units are university departments run by faculty, not by any club
  if (event.hostType === 'unit') return isFaculty(actor);
  return false;
}

// Private club management info (members, registrations): only the club's own staff
export function canViewClubAdmin(actor: Actor | null | undefined, clubId: string): boolean {
  return isStaff(actor) && actor!.clubId === clubId;
}

// Faculty edit / delete only the club they head (rule 18)
export function canEditClub(actor: Actor | null | undefined, clubId: string): boolean {
  return isFaculty(actor) && actor!.clubId === clubId;
}
export const canDeleteClub = canEditClub;
// Any faculty member may register a new club (its head and manager are then assigned in Users)
export const canAddClub = (actor: Actor | null | undefined) => isFaculty(actor);
export const canManageUsers = (actor: Actor | null | undefined) => isFaculty(actor);

export function canManageAnnouncement(actor: Actor | null | undefined, a: { clubId: string | null }): boolean {
  if (!actor) return false;
  if (a.clubId === null) return isFaculty(actor); // university-wide
  return isStaff(actor) && a.clubId === actor.clubId;
}

// Rule 26: what one faculty member may do to another account
export function canEditUser(actor: Actor | null | undefined, target: { id: string; role: string; clubId?: string }): boolean {
  if (!isFaculty(actor)) return false;
  if (target.id === actor!.userId) return true; // own profile (role change is blocked separately)
  if (target.role === 'faculty') return false; // never another faculty member
  if (target.role === 'clubManager') return target.clubId === actor!.clubId;
  return target.role === 'student';
}

export function canDeactivateUser(actor: Actor | null | undefined, target: { id: string; role: string; clubId?: string }): boolean {
  return target.id !== actor?.userId && canEditUser(actor, target);
}

// Clubs a faculty member may put on an account of the given role
export function assignableClubs(
  actor: Actor | null | undefined,
  role: string,
  clubs: Array<{ id: string; name: string }>,
  users: Array<{ id: string; role: string; clubId?: string; active: boolean; status?: string }>,
  editingUserId?: string,
): Array<{ id: string; name: string }> {
  if (!isFaculty(actor)) return [];
  if (role === 'clubManager') return clubs.filter(c => c.id === actor!.clubId);
  if (role === 'faculty') {
    // a new faculty head can only be given a club that has no active head yet
    const headed = new Set(users.filter(u => u.role === 'faculty' && u.active && (u.status ?? 'approved') === 'approved' && u.id !== editingUserId).map(u => u.clubId));
    return clubs.filter(c => !headed.has(c.id));
  }
  return [];
}

// SU2: who may approve / decline a pending self sign-up
// - Club Manager request: the faculty head of that club
// - Faculty request: any faculty member, while the club still has no approved, active head
export function canReviewSignup(
  actor: Actor | null | undefined,
  target: { role: string; clubId?: string; status: string },
  users: Array<{ id: string; role: string; clubId?: string; active: boolean; status: string }>,
): boolean {
  if (!isFaculty(actor) || target.status !== 'pending') return false;
  if (target.role === 'clubManager') return target.clubId === actor!.clubId;
  if (target.role === 'faculty') {
    return !!target.clubId && !users.some(u => u.role === 'faculty' && u.status === 'approved' && u.active && u.clubId === target.clubId);
  }
  return false;
}

export interface HostOption { type: 'club' | 'unit'; id: string; name: string }

// Hosts a person may pick when creating an event (rule 13)
export function allowedHosts(
  actor: Actor | null | undefined,
  clubs: Array<{ id: string; name: string }>,
  units: Array<{ id: string; name: string }>,
): HostOption[] {
  if (!isStaff(actor)) return [];
  const own = clubs.filter(c => c.id === actor!.clubId).map(c => ({ type: 'club' as const, id: c.id, name: c.name }));
  if (isClubManager(actor)) return own;
  return [...own, ...units.map(u => ({ type: 'unit' as const, id: u.id, name: u.name }))];
}
