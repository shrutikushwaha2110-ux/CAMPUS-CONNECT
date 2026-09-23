import { describe, it, expect } from 'vitest';
import events from '../data/events.json';
import type { AppEvent } from '../data/types';
import { eventsToCancelOnDelete } from './clubs';

const all = events as AppEvent[];

describe('deleting a club (rule 20, C4)', () => {
  it('cancels all upcoming Music Club events', () => {
    expect(eventsToCancelOnDelete('music-club', all, '2026-11-01').sort()).toEqual(['battle-of-bands', 'open-mic-evening']);
  });
  it('leaves past events alone (Hackathon Club past-hackathon)', () => {
    expect(eventsToCancelOnDelete('hackathon-club', all, '2026-11-01')).not.toContain('past-hackathon');
  });
  it('skips events already cancelled', () => {
    expect(eventsToCancelOnDelete('esports-club', all, '2026-11-01')).toEqual([]);
  });
  it('never touches unit-hosted events', () => {
    expect(eventsToCancelOnDelete('beyonder-studios', all, '2026-11-01')).toEqual([]);
  });
});
