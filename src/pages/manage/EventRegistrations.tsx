// /manage/events/:id/registrations: seats filled, participants, accept/reject (O7, O8, M3)
import { Link, useParams } from 'react-router';
import { useAppData } from '../../state/AppData';
import { canManageEvent } from '../../lib/permissions';
import { formatDate } from '../../lib/date';
import { unnamedEarlierSeats } from '../../lib/seats';
import { NotAllowed } from '../../components/RequireRole';
import { SeatsBar, EventStatusPill } from '../../components/staff';
import { Button, Card, EmptyState, PageHeader, RegStatusPill, Section, StatTile, useToast } from '../../components/ui';
import type { RegStatus } from '../../lib/constants';

export function EventRegistrations() {
  const { id } = useParams();
  const { session, events, registrations, users, reviewRegistration, hostName } = useAppData();
  const toast = useToast();
  const event = events.find(e => e.id === id);

  if (!event) return <div className="max-w-[640px] mx-auto px-4 py-16"><EmptyState>Event not found.</EmptyState></div>;
  // Private data: a Dance Club manager can't read Music Club registrations, even by typing the URL
  if (!canManageEvent(session, event)) return <NotAllowed message="These registrations belong to another club." />;

  const regs = registrations.filter(r => r.eventId === event.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const counts = {
    confirmed: regs.filter(r => r.status === 'confirmed').length,
    pending: regs.filter(r => r.status === 'pending').length,
    rejected: regs.filter(r => r.status === 'rejected').length,
  };
  const earlierOthers = unnamedEarlierSeats(event.seatsTaken, event.registrations.length);
  const back = session?.role === 'faculty' ? '/events' : '/manage';

  const review = (regId: string, status: RegStatus, name: string) => {
    const err = reviewRegistration(regId, status);
    if (err === 'full') { toast('No seats left, so this registration cannot be accepted.'); return; }
    if (err) return;
    toast(status === 'confirmed' ? `Accepted ${name}` : `Rejected ${name}. Their seat is free again.`);
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-12">
      <Link to={back} className="text-sm font-semibold text-primary">← Back</Link>
      <div className="mt-4">
        <PageHeader eyebrow={`Registrations · ${hostName(event)}`} title={event.title}
          subtitle={<>{formatDate(event.date)} · {event.time} · {event.venue} <span className="ml-2"><EventStatusPill event={event} /></span></>} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 col-span-2 lg:col-span-1 flex items-center"><SeatsBar event={event} /></Card>
        <StatTile label="Confirmed" value={counts.confirmed} hint="on CampusConnect" />
        <StatTile label="Pending" value={counts.pending} />
        <StatTile label="Rejected" value={counts.rejected} />
      </div>

      <Section title="Students registered on CampusConnect">
        {regs.length === 0 ? <EmptyState>No students have registered through CampusConnect yet.</EmptyState> : (
          <div className="flex flex-col gap-3" data-testid="registrations-list">
            {regs.map(r => {
              const u = users.find(x => x.id === r.userId);
              const name = u?.name ?? r.userId;
              return (
                <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-reg={r.id} data-student={r.userId}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-text">{name}</p>
                    <p className="text-xs text-text-muted">{u?.email} · registered {formatDate(r.createdAt.slice(0, 10))}</p>
                  </div>
                  <RegStatusPill status={r.status} />
                  {event.status === 'active' && (
                    <div className="flex gap-2">
                      {r.status !== 'confirmed' && <Button variant="success" onClick={() => review(r.id, 'confirmed', name)}>Accept</Button>}
                      {r.status !== 'rejected' && <Button variant="danger" onClick={() => review(r.id, 'rejected', name)}>Reject</Button>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Earlier attendees (sample data)">
        <Card className="p-4 text-sm">
          {event.registrations.length > 0 ? (
            <ul className="flex flex-wrap gap-2 mb-2">
              {event.registrations.map(n => <li key={n} className="px-3 py-1 rounded-full bg-page-bg border border-border text-xs">{n} · confirmed</li>)}
            </ul>
          ) : <p className="text-text-muted">No named sample attendees.</p>}
          {earlierOthers > 0 && <p className="text-xs text-text-muted">+ {earlierOthers} other seats taken before CampusConnect.</p>}
        </Card>
      </Section>
    </div>
  );
}
