import { useCallback, useMemo } from 'react';
import { useAppData } from '../state/AppData';
import { findRegistration } from '../lib/registrations';

// Registrations of the logged-in student
export function useRegistrations() {
  const { registrations, session, register, cancelRegistration } = useAppData();
  const mine = useMemo(
    () => (session ? registrations.filter(r => r.userId === session.userId) : []),
    [registrations, session],
  );
  const myRegistration = useCallback(
    (eventId: string) => (session ? findRegistration(eventId, session.userId, registrations) : undefined),
    [registrations, session],
  );
  const isRegistered = useCallback((eventId: string) => !!myRegistration(eventId), [myRegistration]);
  return { mine, myRegistration, isRegistered, register, unregister: cancelRegistration };
}
