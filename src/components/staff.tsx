// Building blocks shared by the Club Manager (/manage) and Faculty/Admin (/faculty) areas.
import { useState } from 'react';
import { Link } from 'react-router';
import { useAppData } from '../state/AppData';
import type { AppEvent, Announcement } from '../data/types';
import { formatDate, getToday } from '../lib/date';
import { seatsFilled } from '../lib/seats';
import { canManageEvent, canManageAnnouncement } from '../lib/permissions';
import { Button, ButtonLink, Card, ConfirmDialog, EmptyState, Pill, useToast } from './ui';

export function SeatsBar({ event }: { event: AppEvent }) {
  const { localTaken } = useAppData();
  const filled = seatsFilled(event.seatsTotal, event.seatsTaken, localTaken(event.id));
  const pct = Math.min(100, Math.round((filled / Math.max(1, event.seatsTotal)) * 100));
  return (
    <div className="min-w-[120px]" data-seats-filled={`${filled}/${event.seatsTotal}`}>
      <p className="text-xs font-semibold text-text">{filled} / {event.seatsTotal} seats filled</p>
      <div className="h-1.5 rounded-full bg-border mt-1 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#DC2626' : pct >= 90 ? '#D97706' : '#4637D2' }} />
      </div>
    </div>
  );
}

export function EventStatusPill({ event }: { event: AppEvent }) {
  if (event.status === 'cancelled') return <Pill tone="grey">Cancelled</Pill>;
  if (event.date < getToday()) return <Pill tone="grey">Past</Pill>;
  return <Pill tone="green">Active</Pill>;
}

// List of events with Edit / Registrations / Cancel (O3, O6, O7, O8)
export function EventsTable({ events, showHost = false }: { events: AppEvent[]; showHost?: boolean }) {
  const { session, cancelEvent, hostName, registrations } = useAppData();
  const toast = useToast();
  const [cancelling, setCancelling] = useState<AppEvent | null>(null);

  if (events.length === 0) return <EmptyState>No events yet.</EmptyState>;

  const confirmCancel = async () => {
    if (!cancelling) return;
    const r = await cancelEvent(cancelling.id);
    toast(r.ok ? `${cancelling.title} was cancelled. Registered students will see it as cancelled.` : r.error);
    setCancelling(null);
  };

  return (
    <>
      <div className="flex flex-col gap-3" data-testid="events-table">
        {events.map(e => {
          const pending = registrations.filter(r => r.eventId === e.id && r.status === 'pending').length;
          const editable = canManageEvent(session, e) && e.status !== 'cancelled' && e.date >= getToday();
          return (
            <Card key={e.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4" data-event-row={e.id}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <EventStatusPill event={e} />
                  {e.requiresApproval && <Pill tone="purple">Needs approval</Pill>}
                  {pending > 0 && <Pill tone="amber">{pending} pending</Pill>}
                </div>
                <Link to={`/events/${e.id}`} className="font-semibold text-sm text-text hover:underline">{e.title}</Link>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatDate(e.date)} · {e.time} · {e.venue}{showHost ? ` · ${hostName(e)}` : ''}
                </p>
              </div>
              <SeatsBar event={e} />
              <div className="flex gap-2 flex-wrap">
                <ButtonLink variant="ghost" to={`/manage/events/${e.id}/registrations`}>Registrations</ButtonLink>
                {editable && <ButtonLink variant="secondary" to={`/manage/events/${e.id}/edit`}>Edit</ButtonLink>}
                {editable && <Button variant="danger" onClick={() => setCancelling(e)}>Cancel</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      <ConfirmDialog
        open={!!cancelling}
        title="Are you sure?"
        message={<>Cancel <strong>{cancelling?.title}</strong>? It stays visible as “Cancelled” and nobody can register.</>}
        confirmLabel="Cancel event"
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />
    </>
  );
}

// Announcements with Edit / Delete for the ones this person may manage
export function AnnouncementsList({ items, showScope = false }: { items: Announcement[]; showScope?: boolean }) {
  const { session, deleteAnnouncement, clubs } = useAppData();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  if (items.length === 0) return <EmptyState>No announcements yet.</EmptyState>;

  return (
    <>
      <div className="flex flex-col gap-3" data-testid="announcements-list">
        {items.map(a => (
          <Card key={a.id} className="p-4 flex flex-col sm:flex-row gap-3" data-announcement={a.id}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {showScope && <Pill tone={a.clubId ? 'purple' : 'grey'}>{a.clubId ? clubs.find(c => c.id === a.clubId)?.name : 'University-wide'}</Pill>}
                <span className="text-xs text-text-muted">{formatDate(a.createdAt.slice(0, 10))} · {a.authorName ?? 'Staff'}</span>
              </div>
              <p className="font-semibold text-sm text-text">{a.title}</p>
              <p className="text-sm text-text-muted mt-1">{a.body}</p>
            </div>
            {canManageAnnouncement(session, a) && (
              <div className="flex gap-2 sm:flex-col">
                <ButtonLink variant="ghost" to={`/manage/announcements/${a.id}/edit`}>Edit</ButtonLink>
                <Button variant="danger" onClick={() => setDeleting(a)}>Delete</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <ConfirmDialog
        open={!!deleting}
        title="Are you sure?"
        message={<>Delete the announcement <strong>{deleting?.title}</strong>?</>}
        confirmLabel="Delete"
        onConfirm={async () => { if (deleting) { const r = await deleteAnnouncement(deleting.id); toast(r.ok ? 'Announcement deleted' : r.error); } setDeleting(null); }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
