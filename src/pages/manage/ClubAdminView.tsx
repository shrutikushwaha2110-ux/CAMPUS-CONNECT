// Private management view of ONE club: info, members, events, registrations, announcements.
// Used by the Club Manager dashboard (their own club only) and by Faculty/Admin (any club).
import { useMemo, useState } from 'react';
import { useAppData } from '../../state/AppData';
import { canViewClubAdmin } from '../../lib/permissions';
import { memberCount } from '../../lib/memberships';
import { getToday, formatDate } from '../../lib/date';
import { NotAllowed } from '../../components/RequireRole';
import { AnnouncementsList, EventsTable } from '../../components/staff';
import { ButtonLink, Card, EmptyState, PageHeader, Pill, Section, StatTile } from '../../components/ui';

export function ClubAdminView({ clubId, eyebrow }: { clubId: string; eyebrow: string }) {
  const { session, clubs, units, events, registrations, memberships, users, announcements } = useAppData();
  const [showPast, setShowPast] = useState(false);
  const club = clubs.find(c => c.id === clubId);
  const today = getToday();

  const clubEvents = useMemo(
    () => events.filter(e => e.hostType === 'club' && e.hostId === clubId)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [events, clubId],
  );

  // Checked here too, not only in the route: the manager can never read another club's private data (M1)
  if (!canViewClubAdmin(session, clubId)) {
    return <NotAllowed message="You can only manage your own club." />;
  }
  if (!club) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-16">
        <EmptyState>This club no longer exists. It may have been deleted by Faculty/Admin.</EmptyState>
      </div>
    );
  }

  const upcoming = clubEvents.filter(e => e.date >= today);
  const past = clubEvents.filter(e => e.date < today);
  const eventIds = new Set(clubEvents.map(e => e.id));
  const clubRegs = registrations.filter(r => eventIds.has(r.eventId));
  const pending = clubRegs.filter(r => r.status === 'pending').length;
  const members = memberships.filter(m => m.clubId === clubId);
  const unit = units.find(u => u.id === club.unitId);
  const clubAnnouncements = announcements.filter(a => a.clubId === clubId);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12" data-testid="club-admin" data-club={clubId}>
      <PageHeader
        eyebrow={eyebrow}
        title={club.name}
        subtitle={club.description}
        actions={<>
          <ButtonLink to={`/manage/events/new?host=club:${clubId}`}>+ New event</ButtonLink>
          <ButtonLink variant="secondary" to={`/manage/announcements/new?club=${clubId}`}>+ Announcement</ButtonLink>
        </>}
      />

      <Card className="p-5 mb-8 flex flex-wrap gap-x-8 gap-y-2 text-sm" data-testid="club-info">
        <span><span className="text-text-muted">Category · </span><strong>{club.category}</strong></span>
        <span><span className="text-text-muted">Supervising unit · </span><strong>{unit?.name ?? club.unitId}</strong></span>
        <span><span className="text-text-muted">Student manager · </span><strong>{club.managerName}</strong></span>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatTile label="Members" value={memberCount(club, memberships)} hint={`${members.length} joined on CampusConnect`} />
        <StatTile label="Upcoming events" value={upcoming.filter(e => e.status === 'active').length} />
        <StatTile label="Registrations" value={clubRegs.filter(r => r.status !== 'rejected').length} hint="made on CampusConnect" />
        <StatTile label="Pending approvals" value={pending} />
      </div>

      <Section title="Upcoming events" action={past.length > 0 && (
        <button className="text-sm font-semibold text-primary" onClick={() => setShowPast(s => !s)}>{showPast ? 'Hide' : 'Show'} past events ({past.length})</button>
      )}>
        <EventsTable events={upcoming} />
        {showPast && <div className="mt-4"><EventsTable events={past} /></div>}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title={`Members (${memberCount(club, memberships)})`}>
          <Card className="p-4">
            {members.length === 0 ? (
              <p className="text-sm text-text-muted">No students have joined through CampusConnect yet.</p>
            ) : (
              <ul className="divide-y divide-border" data-testid="club-members">
                {members.map(m => {
                  const u = users.find(x => x.id === m.userId);
                  return (
                    <li key={m.userId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <span><strong className="text-text">{u?.name ?? m.userId}</strong><span className="text-text-muted"> · {u?.email}</span></span>
                      <span className="text-xs text-text-muted">joined {formatDate(m.joinedAt.slice(0, 10))}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-text-muted mt-3">+ {club.memberCount} members from before CampusConnect (sample data).</p>
          </Card>
        </Section>

        <Section title="Club announcements" action={<Pill tone="purple">Visible to members</Pill>}>
          <AnnouncementsList items={clubAnnouncements} />
        </Section>
      </div>
    </div>
  );
}
