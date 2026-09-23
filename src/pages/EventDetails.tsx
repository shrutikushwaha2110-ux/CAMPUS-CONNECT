import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router';
import { useAppData } from '../state/AppData';
import { useRegistrations } from '../hooks/useRegistrations';
import { CategoryBadge } from '../components/CategoryBadge';
import { SeatsBadge } from '../components/SeatsBadge';
import { EventPoster } from '../components/EventPoster';
import { ConfirmDialog, RegStatusPill, useToast } from '../components/ui';
import { seatsLeft, seatStatus } from '../lib/seats';
import { formatDate, getToday } from '../lib/date';
import { registerBlockReason } from '../lib/registrations';
import { canManageEvent } from '../lib/permissions';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { events, session, registrations, localTaken, hostName } = useAppData();
  const { myRegistration, register, unregister } = useRegistrations();
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const event = id ? events.find(e => e.id === id) : undefined;

  // F13: unknown id such as /events/999 shows a friendly message, never a blank page
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EEECFB' }}>
          <svg width="24" height="24" fill="none" stroke="#4637D2" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
        </div>
        <h2 className="font-bold text-xl" style={{ color: '#1F1D2B' }}>Event not found</h2>
        <p className="text-sm" style={{ color: '#454242' }}>That event doesn't exist or may have been removed.</p>
        <Link to="/events" className="text-sm font-semibold" style={{ color: '#4637D2' }}>← Back to events</Link>
      </div>
    );
  }

  const mine = myRegistration(event.id);
  const taken = localTaken(event.id);
  const left = seatsLeft(event.seatsTotal, event.seatsTaken, taken);
  const status = seatStatus(event.seatsTotal, event.seatsTaken, taken, event.status);
  const isCancelled = event.status === 'cancelled';
  const block = registerBlockReason({ event, role: session?.role ?? null, userId: session?.userId ?? null, regs: registrations, today: getToday() });
  const host = hostName(event);
  const hostLink = event.hostType === 'club' ? '/clubs' : '/units';
  const canManage = canManageEvent(session, event);
  const loginNext = `/login/student?next=${encodeURIComponent(location.pathname)}`;

  const handleRegister = () => {
    const result = register(event.id);
    if (typeof result === 'string') return;
    toast(result.status === 'pending'
      ? `Request sent to ${host}. Waiting for approval.`
      : `You're registered for ${event.title}`);
  };

  const handleUnregister = () => {
    unregister(event.id);
    setConfirmCancel(false);
    toast('Registration cancelled');
  };

  const blockedLabel: Record<string, string> = {
    cancelled: 'Cancelled', past: 'Event Passed', full: 'Event Full',
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10">
      <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold mb-8" style={{ color: '#4637D2' }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to events
      </Link>

      <EventPoster category={event.category} className="w-full rounded-2xl mb-10" style={{ height: 320 }} />

      {isCancelled && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl mb-8 text-sm font-medium border"
          style={{ backgroundColor: '#F8FAFC', color: '#334155', borderColor: '#E2E8F0' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          This event was cancelled.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-12 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <CategoryBadge category={event.category} />
            <span className="text-sm" style={{ color: '#454242' }}>
              Hosted by <Link to={hostLink} className="font-bold underline-offset-2 hover:underline" style={{ color: '#1F1D2B' }}>{host}</Link>
            </span>
          </div>
          <h1 className="font-bold mb-5" style={{ fontSize: 'clamp(26px,4vw,40px)', color: '#1F1D2B', lineHeight: 1.2 }}>
            {event.title}
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: '#454242' }}>{event.description}</p>

          <div className="rounded-2xl p-6 flex flex-col gap-4 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            {[
              { icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, label: 'Date', value: formatDate(event.date) },
              { icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, label: 'Time', value: event.time },
              { icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>, label: 'Venue', value: event.venue },
              { icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, label: 'Hosted by', value: host },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 text-sm">
                <span style={{ color: '#4637D2' }}>{row.icon}</span>
                <span style={{ color: '#454242' }}><span className="font-semibold" style={{ color: '#1F1D2B' }}>{row.label}</span> · {row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Registration card */}
        <div className="w-full md:w-80 flex-shrink-0 rounded-2xl p-6 md:sticky top-24 flex flex-col gap-4 bg-white border"
          style={{ borderColor: '#E2E8F0', boxShadow: '0 4px 24px rgba(31,29,43,0.08)' }} data-testid="registration-card">
          <SeatsBadge status={status} seatsLeft={left} />

          {!isCancelled && status !== 'full' && (
            <p className="text-sm" style={{ color: '#454242' }}>
              <span className="font-semibold" style={{ color: '#1F1D2B' }}>{left}</span> of {event.seatsTotal} seats left
            </p>
          )}

          <p className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#EEECFB', color: '#2B2093' }}>
            Open to all students. You don't need to be a member of {host} to register.
            {event.requiresApproval && ' The host approves each registration.'}
          </p>

          {mine ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap text-sm font-semibold" style={{ color: '#1F1D2B' }}>
                Your registration: <RegStatusPill status={mine.status} eventCancelled={isCancelled} />
              </div>
              {mine.status === 'confirmed' && !isCancelled && (
                <button className="w-full py-3.5 rounded-xl font-semibold text-sm border-2 flex items-center justify-center gap-2 cursor-default"
                  style={{ backgroundColor: '#fff', color: '#4637D2', borderColor: '#4637D2' }} aria-disabled="true">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  Registered
                </button>
              )}
              {mine.status === 'rejected' && <p className="text-xs" style={{ color: '#991B1B' }}>The host declined this registration.</p>}
              {mine.status !== 'rejected' && !isCancelled && (
                <button onClick={() => setConfirmCancel(true)} className="text-xs text-center font-medium py-2 hover:underline" style={{ color: '#454242' }}>
                  Cancel registration
                </button>
              )}
            </div>
          ) : block === 'login' ? (
            <Link to={loginNext} className="w-full py-3.5 rounded-xl font-semibold text-sm text-center text-white bg-primary hover:bg-primary-dark">
              Log in as a student to register
            </Link>
          ) : block === 'not-student' ? (
            <div className="flex flex-col gap-2 text-sm" style={{ color: '#454242' }}>
              <p>Only students can register for events.</p>
              {canManage && (
                <Link to={`/manage/events/${event.id}/registrations`} className="w-full py-3 rounded-xl font-semibold text-sm text-center text-white bg-primary hover:bg-primary-dark">
                  Manage registrations
                </Link>
              )}
            </div>
          ) : block ? (
            <button disabled className="w-full py-3.5 rounded-xl font-semibold text-sm" style={{ backgroundColor: '#E2E8F0', color: '#454242', cursor: 'not-allowed' }}>
              {blockedLabel[block] ?? 'Unavailable'}
            </button>
          ) : (
            <button onClick={handleRegister} className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-primary hover:bg-primary-dark transition-colors">
              {event.requiresApproval ? 'Request to register' : 'Register'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Are you sure?"
        message={<>Cancel your registration for <strong>{event.title}</strong>? Your seat will go to someone else.</>}
        confirmLabel="Yes, cancel"
        onConfirm={handleUnregister}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
