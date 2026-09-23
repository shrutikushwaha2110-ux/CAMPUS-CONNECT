import { describe, it, expect } from 'vitest';
import events from '../data/events.json';
import clubs from '../data/clubs.json';
import units from '../data/units.json';
import { filterEvents, upcomingSorted, type EventFilter } from './eventFilter';

// Fixed "today" so results don't change as the calendar moves (CLAUDE.md: dates come from getToday)
const TODAY = '2026-11-01';

const hostNameOf = (e: { hostType: string; hostId: string }) =>
  e.hostType === 'club'
    ? clubs.find(c => c.id === e.hostId)?.name ?? ''
    : units.find(u => u.id === e.hostId)?.name ?? '';

const none: EventFilter = { query: '', category: 'All', date: 'any', host: '' };
const run = (f: Partial<EventFilter>) => filterEvents(events, { ...none, ...f }, hostNameOf, TODAY);

describe('F1 upcoming list (rule 8)', () => {
  it('hides the past event', () => {
    expect(upcomingSorted(events, TODAY).map(e => e.id)).not.toContain('past-hackathon');
  });
  it('sorts soonest first', () => {
    const dates = upcomingSorted(events, TODAY).map(e => e.date + e.time);
    expect(dates).toEqual([...dates].sort());
  });
  it('puts Annual Dance Fest (14 Nov) first', () => {
    expect(upcomingSorted(events, TODAY)[0].id).toBe('annual-dance-fest');
  });
});

describe('F2 keyword search', () => {
  it('"Dance" finds title matches and Dance Club events', () => {
    const ids = run({ query: 'Dance' }).map(e => e.id);
    expect(ids).toEqual(expect.arrayContaining(['annual-dance-fest', 'dance-workshop']));
    expect(ids).toHaveLength(2);
  });
  it('matches the host name, not just the id ("Beyonder")', () => {
    const ids = run({ query: 'Beyonder' }).map(e => e.id);
    expect(ids).toEqual(expect.arrayContaining(['maker-tools-workshop', 'film-screening']));
  });
  it('matches category ("guest talk")', () => {
    expect(run({ query: 'guest talk' }).map(e => e.id)).toEqual(['ai-ethics-talk']);
  });
  it('"zzzz" returns nothing (empty state, rule 9)', () => {
    expect(run({ query: 'zzzz' })).toHaveLength(0);
  });
});

describe('F3 filters', () => {
  it('host filter: Music Club shows only Music Club events', () => {
    const result = run({ host: 'club:music-club' });
    expect(result.map(e => e.id).sort()).toEqual(['battle-of-bands', 'open-mic-evening']);
  });
  it('host filter works for units', () => {
    expect(run({ host: 'unit:beyonder-studios' })).toHaveLength(2);
  });
  it('category filter: Workshop', () => {
    expect(run({ category: 'Workshop' }).every(e => e.category === 'Workshop')).toBe(true);
    expect(run({ category: 'Workshop' })).toHaveLength(2);
  });
  it('date filter "week" keeps only the next 7 days', () => {
    expect(run({ date: 'week' }).every(e => e.date <= '2026-11-08')).toBe(true);
  });
  it('date filter "month" keeps only the next 30 days', () => {
    const ids = run({ date: 'month' }).map(e => e.id);
    expect(ids).toContain('annual-dance-fest');
    expect(ids).not.toContain('career-fair');
  });
  it('filters combine (category + host)', () => {
    expect(run({ category: 'Workshop', host: 'club:dance-club' }).map(e => e.id)).toEqual(['dance-workshop']);
  });
});
