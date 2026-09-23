// Deleting a club (SPEC §7 rule 20): its upcoming events are cancelled, its past events stay as they are.
import type { AppEvent } from '../data/types';

export function eventsToCancelOnDelete(clubId: string, events: AppEvent[], today: string): string[] {
  return events
    .filter(e => e.hostType === 'club' && e.hostId === clubId && e.date >= today && e.status !== 'cancelled')
    .map(e => e.id);
}
