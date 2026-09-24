// /faculty: Faculty/Admin overview of the whole system
import { Link } from 'react-router';
import { useAppData } from '../../state/AppData';
import { getToday, formatDate } from '../../lib/date';
import { seatsLeft, seatStatus } from '../../lib/seats';
import { canManageEvent } from '../../lib/permissions';
import { upcomingSorted } from '../../lib/eventFilter';
import { AnnouncementsList } from '../../components/staff';
import { ButtonLink, Card, EmptyState, PageHeader, Pill, Section, StatTile } from '../../components/ui';

const AREAS = [
  { to: '/faculty/clubs', title: 'Clubs', text: 'Add, edit or delete clubs and see each club’s members and events.' },
  { to: '/faculty/events', title: 'Events', text: 'Create, edit or cancel any event and review registrations.' },
  { to: '/faculty/users', title: 'Users', text: 'Add accounts, assign club managers, deactivate users.' },
  { to: '/faculty/announcements', title: 'Announcements', text: 'Post university-wide news or messages to a club.' },
];

export function FacultyHome() {
  const { session, currentUser, clubs, events, registrations, users, announcements, localTaken, hostName } = useAppData();
  const today = getToday();
  const upcoming = upcomingSorted(events).filter(e => e.status === 'active');
  const pending = registrations.filter(r => r.status === 'pending');
  // Needs attention: events with pending approvals, or "almost full"/"full" by the shared seat rule (F11)
  const status = (e: typeof upcoming[number]) => seatStatus(e.seatsTotal, e.seatsTaken, localTaken(e.id), e.status);
  const attention = upcoming.filter(e =>
    pending.some(r => r.eventId === e.id) || status(e) === 'almost-full' || status(e) === 'full',
  ).slice(0, 6);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <PageHeader eyebrow="Faculty / Admin dashboard" title={`Welcome, ${currentUser?.name ?? 'Admin'}`}
        subtitle="Everything needed to run the university's clubs and events."
        actions={<><ButtonLink to="/manage/events/new">+ New event</ButtonLink><ButtonLink variant="secondary" to="/faculty/clubs/new">+ New club</ButtonLink></>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <StatTile label="Clubs" value={clubs.length} />
        <StatTile label="Upcoming events" value={upcoming.length} />
        <StatTile label="Registrations" value={registrations.filter(r => r.status !== 'rejected').length} hint="on CampusConnect" />
        <StatTile label="Pending approvals" value={pending.length} />
        <StatTile label="Users" value={users.length} hint={`${users.filter(u => !u.active).length} deactivated`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {AREAS.map(a => (
          <Link key={a.to} to={a.to} className="bg-white rounded-2xl p-5 border border-border hover:border-primary hover:-translate-y-0.5 transition-all">
            <p className="font-bold text-text">{a.title} →</p>
            <p className="text-xs text-text-muted mt-1">{a.text}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Needs attention">
          {attention.length === 0 ? <EmptyState>Nothing needs attention.</EmptyState> : (
            <div className="flex flex-col gap-3">
              {attention.map(e => {
                const p = pending.filter(r => r.eventId === e.id).length;
                const left = seatsLeft(e.seatsTotal, e.seatsTaken, localTaken(e.id));
                return (
                  <Card key={e.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text">{e.title}</p>
                      <p className="text-xs text-text-muted">{formatDate(e.date)} · {hostName(e)}</p>
                    </div>
                    {p > 0 && <Pill tone="amber">{p} pending</Pill>}
                    {status(e) === 'full' && <Pill tone="red">Full</Pill>}
                    {status(e) === 'almost-full' && <Pill tone="amber">{left} left</Pill>}
                    {canManageEvent(session, e) && <Link to={`/manage/events/${e.id}/registrations`} className="text-xs font-semibold text-primary">Review →</Link>}
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
        <Section title="Latest announcements" action={<Link to="/faculty/announcements" className="text-sm font-semibold text-primary">All →</Link>}>
          <AnnouncementsList items={announcements.slice(0, 3)} showScope />
        </Section>
      </div>
      <p className="text-xs text-text-muted mt-6">Today is {formatDate(today)}.</p>
    </div>
  );
}
