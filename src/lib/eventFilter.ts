// Event list rules (SPEC §7 rules 8–9, requirements F1–F3)
import { getToday } from './date';

export type DateFilter = 'any' | 'week' | 'month';

interface FilterableEvent {
  title: string;
  category: string;
  date: string;
  time: string;
  hostType: string;
  hostId: string;
}

export interface EventFilter {
  query: string;
  category: string; // 'All' or one of EVENT_CATEGORIES
  date: DateFilter;
  host: string; // '' for all hosts, otherwise "club:<id>" or "unit:<id>"
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Rule 8: past events are hidden and the soonest event comes first
export function upcomingSorted<T extends FilterableEvent>(events: T[], today = getToday()): T[] {
  return events
    .filter(e => e.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// F2: keyword matches title, category, or host *name* (not the internal id)
export function matchesQuery(e: FilterableEvent, query: string, hostName: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    e.title.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    hostName.toLowerCase().includes(q)
  );
}

export function matchesDate(e: FilterableEvent, filter: DateFilter, today = getToday()): boolean {
  if (filter === 'week') return e.date >= today && e.date <= addDays(today, 7);
  if (filter === 'month') return e.date >= today && e.date <= addDays(today, 30);
  return true;
}

export function filterEvents<T extends FilterableEvent>(
  events: T[],
  filter: EventFilter,
  hostNameOf: (e: T) => string,
  today = getToday(),
): T[] {
  return upcomingSorted(events, today).filter(e =>
    (filter.category === 'All' || e.category === filter.category) &&
    (!filter.host || `${e.hostType}:${e.hostId}` === filter.host) &&
    matchesDate(e, filter.date, today) &&
    matchesQuery(e, filter.query, hostNameOf(e)),
  );
}
