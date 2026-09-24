// Short readable ids for records created in the app, e.g. "salsa-night-k3f9"
export function makeId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item';
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`;
}

// Ids accepted by the API (blocks odd characters in URLs and keys)
export const isSafeId = (id: string) => /^[a-z0-9][a-z0-9-]{1,63}$/.test(id);
