// JSON seed + localStorage changes → what the site shows (SPEC §6).
// A change saved under an existing id overrides that record; a change under a new id is a newly created record;
// `_deleted: true` hides the record (it is marked, never erased, so history stays explainable).

export type Change<T> = Partial<T> & { _deleted?: boolean };
export type Changes<T> = Record<string, Change<T>>;

export function mergeById<T extends { id: string }>(seed: T[], changes: Changes<T>): T[] {
  const seedIds = new Set(seed.map(s => s.id));
  const merged = seed.map(s => ({ ...s, ...(changes[s.id] ?? {}) }) as T & { _deleted?: boolean });
  const created = Object.entries(changes)
    .filter(([id]) => !seedIds.has(id))
    .map(([id, c]) => ({ ...c, id }) as T & { _deleted?: boolean });
  return [...merged, ...created]
    .filter(r => !r._deleted)
    .map(({ _deleted, ...rest }) => rest as unknown as T);
}

export function withChange<T>(changes: Changes<T>, id: string, patch: Change<T>): Changes<T> {
  return { ...changes, [id]: { ...(changes[id] ?? {}), ...patch } };
}

// Short readable id for records created in the browser, e.g. "salsa-night-k3f9"
export function makeId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item';
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`;
}
