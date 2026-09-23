// Who may manage what (SPEC §7 rules 12, 13, 17, 18)
// Club Manager: only their own club. Faculty/Admin: everything.

export interface Actor {
  role: string;
  clubId?: string;
}

export const isFaculty = (a: Actor | null | undefined) => a?.role === 'faculty';
export const isClubManager = (a: Actor | null | undefined) => a?.role === 'clubManager';

export function canManageEvent(actor: Actor | null | undefined, event: { hostType: string; hostId: string }): boolean {
  if (!actor) return false;
  if (isFaculty(actor)) return true;
  if (isClubManager(actor)) return event.hostType === 'club' && event.hostId === actor.clubId;
  return false;
}

// Private club management info: members, registrations, drafts
export function canViewClubAdmin(actor: Actor | null | undefined, clubId: string): boolean {
  if (!actor) return false;
  if (isFaculty(actor)) return true;
  return isClubManager(actor) && actor.clubId === clubId;
}

// Add / edit / delete clubs, manage users: faculty only
export const canManageClubs = (actor: Actor | null | undefined) => isFaculty(actor);
export const canManageUsers = (actor: Actor | null | undefined) => isFaculty(actor);

export function canManageAnnouncement(actor: Actor | null | undefined, a: { clubId: string | null }): boolean {
  if (!actor) return false;
  if (isFaculty(actor)) return true;
  return isClubManager(actor) && a.clubId !== null && a.clubId === actor.clubId;
}

export interface HostOption { type: 'club' | 'unit'; id: string; name: string }

// Hosts a person may pick when creating an event (rule 13)
export function allowedHosts(
  actor: Actor | null | undefined,
  clubs: Array<{ id: string; name: string }>,
  units: Array<{ id: string; name: string }>,
): HostOption[] {
  if (isClubManager(actor)) {
    const club = clubs.find(c => c.id === actor!.clubId);
    return club ? [{ type: 'club', id: club.id, name: club.name }] : [];
  }
  if (isFaculty(actor)) {
    return [
      ...clubs.map(c => ({ type: 'club' as const, id: c.id, name: c.name })),
      ...units.map(u => ({ type: 'unit' as const, id: u.id, name: u.name })),
    ];
  }
  return [];
}
