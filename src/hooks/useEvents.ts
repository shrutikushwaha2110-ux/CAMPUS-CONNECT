import { useCallback, useMemo } from 'react';
import { useAppData } from '../state/AppData';
import { upcomingSorted } from '../lib/eventFilter';

export function useEvents() {
  const { events, saveEvent, cancelEvent, localTaken, hostName } = useAppData();
  // Rule 8: hide past events, soonest first
  const upcomingEvents = useMemo(() => upcomingSorted(events), [events]);
  const getEvent = useCallback((id: string) => events.find(e => e.id === id), [events]);
  return { events, upcomingEvents, getEvent, saveEvent, cancelEvent, localTaken, hostName };
}
