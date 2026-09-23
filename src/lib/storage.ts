// All localStorage access goes through this module using campusconnect.* keys (SPEC §6).
// Every read has a fallback and every write is wrapped, so a blocked/full storage never crashes a page.

export const KEYS = {
  SESSION: 'campusconnect.session',
  REGISTRATIONS: 'campusconnect.registrations',
  MEMBERSHIPS: 'campusconnect.memberships',
  FOLLOWS: 'campusconnect.follows',
  EVENT_CHANGES: 'campusconnect.eventChanges',
  CLUB_CHANGES: 'campusconnect.clubChanges',
  USER_CHANGES: 'campusconnect.userChanges',
  ANNOUNCEMENT_CHANGES: 'campusconnect.announcementChanges',
} as const;

// Keys from the first version (single demo student). Removed on load so old data can't confuse the new model.
const LEGACY_KEYS = ['campusconnect.joinedClubs', 'campusconnect.followedUnits'];

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode, quota): the app keeps working in memory
  }
}

// Returns only well-formed objects from a stored list (drops v1 strings like "annual-dance-fest")
export function readList<T extends object>(key: string): T[] {
  const v = read<unknown>(key, []);
  return Array.isArray(v) ? (v.filter(x => x && typeof x === 'object') as T[]) : [];
}

export function clearLegacy(): void {
  try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}
