// Student dashboard (F10): registrations with live status, joined clubs (x/2), announcements, upcoming events, followed units.
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAppData } from '../state/AppData';
import { useRegistrations } from '../hooks/useRegistrations';
import { useMemberships } from '../hooks/useMemberships';
import { CategoryBadge } from '../components/CategoryBadge';
import { StudentRules } from '../components/StudentRules';
import { Card, ConfirmDialog, EmptyState, PageHeader, Pill, RegStatusPill, Section, StatTile, useToast } from '../components/ui';
import { formatDate, getToday } from '../lib/date';
import { upcomingSorted } from '../lib/eventFilter';
import { memberCount } from '../lib/memberships';
import { MAX_CLUBS_PER_STUDENT } from '../lib/constants';

export function Dashboard() {
  const { events, clubs, units, announcements, memberships, currentUser, hostName } = useAppData();
  const { mine } = useRegistrations();
  const { joinedClubs, followedUnits, leaveClub } = useMemberships();
  const toast = useToast();
  const [leaving, setLeaving] = useState<{ id: string; name: string } | null>(null);
  const today = getToday();

  const myRegs = useMemo(
    () => mine
      .map(r => ({ reg: r, event: events.find(e => e.id === r.eventId)! }))
      .filter(x => x.event)
      .sort((a, b) => (a.event.date + a.event.time).localeCompare(b.event.date + b.event.time)),
    [mine, events],
  );
  const activeRegs = myRegs.filter(x => x.event.status === 'active' && x.reg.status !== 'rejected' && x.event.date >= today);
  const myClubs = clubs.filter(c => joinedClubs.includes(c.id));
  const myUnits = units.filter(u => followedUnits.includes(u.id));
  const myAnnouncements = announcements.filter(a => a.clubId === null || joinedClubs.includes(a.clubId)).slice(0, 5);

  // Suggestions: upcoming active events not yet registered, events from my clubs first
  const suggestions = useMemo(() => {
    const registeredIds = new Set(mine.map(r => r.eventId));
    return upcomingSorted(events)
      .filter(e => e.status === 'active' && !registeredIds.has(e.id))
      .sort((a, b) => Number(joinedClubs.includes(b.hostId)) - Number(joinedClubs.includes(a.hostId)))
      .slice(0, 4);
  }, [events, mine, joinedClubs]);

  const confirmLeave = () => {
    if (!leaving) return;
    leaveClub(leaving.id);
    toast(`You left ${leaving.name}`);
    setLeaving(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <PageHeader
        eyebrow="Student dashboard"
        title={`Hi, ${currentUser?.name.split(' ')[0] ?? 'there'}`}
        subtitle="Your registrations, clubs and campus news in one place."
        actions={<Link to="/events" className="inline-flex items-center rounded-xl font-semibold text-sm px-4 min-h-[40px] bg-primary text-white hover:bg-primary-dark">Browse events</Link>}
      />

      <div className="mb-8"><StudentRules joined={joinedClubs.length} /></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatTile label="Upcoming registrations" value={activeRegs.length} />
        <StatTile label="Clubs joined" value={`${joinedClubs.length}/${MAX_CLUBS_PER_STUDENT}`} />
        <StatTile label="Units followed" value={myUnits.length} />
        <StatTile label="Events on campus" value={upcomingSorted(events).filter(e => e.status === 'active').length} hint="upcoming" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Section title="My registered events" action={<Link to="/events" className="text-sm font-semibold text-primary">Browse events →</Link>}>
            {myRegs.length === 0 ? (
              <EmptyState>You haven't registered for any events yet.</EmptyState>
            ) : (
              <div className="flex flex-col gap-3" data-testid="my-registrations">
                {myRegs.map(({ reg, event }) => (
                  <Link key={reg.id} to={`/events/${event.id}`} data-event={event.id}
                    className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-border hover:border-primary transition-colors">
                    <div className="w-11 h-11 rounded-xl flex-shrink-0 hidden sm:flex flex-col items-center justify-center text-white text-[10px] font-bold leading-tight" style={{ backgroundColor: '#1C1750' }}>
                      <span>{formatDate(event.date).split(' ')[1]}</span><span>{formatDate(event.date).split(' ')[2]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-text">{event.title}</p>
                      <p className="text-xs mt-0.5 text-text-muted">{formatDate(event.date)} · {event.time} · {hostName(event)}</p>
                    </div>
                    <RegStatusPill status={reg.status} eventCancelled={event.status === 'cancelled'} />
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="Upcoming events for you" action={<Link to="/events" className="text-sm font-semibold text-primary">See all →</Link>}>
            {suggestions.length === 0 ? <EmptyState>No other upcoming events right now.</EmptyState> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestions.map(e => (
                  <Link key={e.id} to={`/events/${e.id}`} className="bg-white rounded-2xl p-4 border border-border hover:border-primary flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={e.category} />
                      {joinedClubs.includes(e.hostId) && <Pill tone="green">Your club</Pill>}
                    </div>
                    <p className="font-semibold text-sm text-text">{e.title}</p>
                    <p className="text-xs text-text-muted">{formatDate(e.date)} · {e.time} · {hostName(e)}</p>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div>
          <Section title={`My clubs (${joinedClubs.length}/${MAX_CLUBS_PER_STUDENT})`} action={<Link to="/clubs" className="text-sm font-semibold text-primary">Browse clubs →</Link>}>
            {myClubs.length === 0 ? (
              <EmptyState>You haven't joined any clubs yet.</EmptyState>
            ) : (
              <div className="flex flex-col gap-3" data-testid="my-clubs">
                {myClubs.map(c => (
                  <Card key={c.id} className="p-4 flex items-center gap-3" data-club={c.id}>
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white" style={{ backgroundColor: '#1C1750' }}>{c.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text">{c.name}</p>
                      <p className="text-xs mt-0.5 text-text-muted">{memberCount(c, memberships)} members</p>
                    </div>
                    <button onClick={() => setLeaving({ id: c.id, name: c.name })} className="text-xs font-semibold text-text-muted hover:text-[#991B1B]">Leave</button>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Announcements">
            {myAnnouncements.length === 0 ? <EmptyState>No announcements yet. Join a club to see its news.</EmptyState> : (
              <div className="flex flex-col gap-3" data-testid="my-announcements">
                {myAnnouncements.map(a => (
                  <Card key={a.id} className="p-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Pill tone={a.clubId ? 'purple' : 'grey'}>{a.clubId ? clubs.find(c => c.id === a.clubId)?.name : 'University'}</Pill>
                      <span className="text-xs text-text-muted">{formatDate(a.createdAt.slice(0, 10))}</span>
                    </div>
                    <p className="font-semibold text-sm text-text">{a.title}</p>
                    <p className="text-xs mt-1 text-text-muted">{a.body}</p>
                  </Card>
                ))}
              </div>
            )}
          </Section>

          <Section title="Following" action={<Link to="/units" className="text-sm font-semibold text-primary">Units →</Link>}>
            {myUnits.length === 0 ? <EmptyState>You're not following any units yet.</EmptyState> : (
              <div className="flex flex-col gap-2">
                {myUnits.map(u => (
                  <Card key={u.id} className="p-4">
                    <p className="font-semibold text-sm text-text">{u.name}</p>
                    <p className="text-xs text-text-muted">{u.facultyName}</p>
                  </Card>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <ConfirmDialog open={!!leaving} title="Are you sure?" message={<>Leave <strong>{leaving?.name}</strong>?</>}
        confirmLabel="Leave club" onConfirm={confirmLeave} onCancel={() => setLeaving(null)} />
    </div>
  );
}
