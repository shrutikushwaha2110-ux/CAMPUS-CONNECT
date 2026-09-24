// Private management view of ONE club: info, join requests, members, events, registrations.
// Used by the Club Manager dashboard and by the club's faculty head (/faculty/clubs/:id); both own club only.
import { useMemo, useState } from 'react';
import { useAppData } from '../../state/AppData';
import { canViewClubAdmin, canEditClub, canManageMembers } from '../../lib/permissions';
import { getToday, formatDate } from '../../lib/date';
import { NotAllowed } from '../../components/RequireRole';
import { EventsTable } from '../../components/staff';
import { Button, ButtonLink, Card, ConfirmDialog, EmptyState, PageHeader, Pill, Section, StatTile, useToast } from '../../components/ui';

export function ClubAdminView({ clubId, eyebrow }: { clubId: string; eyebrow: string }) {
  const { session, clubs, units, events, registrations, memberships, users, clubMemberCount, reviewMember, removeMember } = useAppData();
  const toast = useToast();
  const [removing, setRemoving] = useState<{ userId: string; name: string } | null>(null);
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
  const members = memberships.filter(m => m.clubId === clubId && m.status === 'approved');
  const requests = memberships.filter(m => m.clubId === clubId && m.status === 'pending');
  const canManage = canManageMembers(session, clubId);
  const nameOf = (userId: string) => users.find(u => u.id === userId)?.name ?? userId;

  // F9b / M8: approve or decline a join request; remove a member
  const review = async (userId: string, status: 'approved' | 'rejected') => {
    const r = await reviewMember(clubId, userId, status);
    toast(r.ok ? (status === 'approved' ? `${nameOf(userId)} is now a member of ${club.name}` : `Declined ${nameOf(userId)}'s request`) : r.error);
  };
  const confirmRemove = async () => {
    if (!removing) return;
    const r = await removeMember(clubId, removing.userId);
    toast(r.ok ? `${removing.name} removed from ${club.name}` : r.error);
    setRemoving(null);
  };
  const unit = units.find(u => u.id === club.unitId);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12" data-testid="club-admin" data-club={clubId}>
      <PageHeader
        eyebrow={eyebrow}
        title={club.name}
        subtitle={club.description}
        actions={<>
          <ButtonLink to={`/manage/events/new?host=club:${clubId}`}>+ New event</ButtonLink>
          <ButtonLink variant="secondary" to={`/manage/announcements/new?club=${clubId}`}>+ Announcement</ButtonLink>
          {canEditClub(session, clubId) && <ButtonLink variant="ghost" to={`/faculty/clubs/${clubId}/edit`}>Edit club info</ButtonLink>}
        </>}
      />

      <Card className="p-5 mb-8 flex flex-wrap gap-x-8 gap-y-2 text-sm" data-testid="club-info">
        <span><span className="text-text-muted">Category · </span><strong>{club.category}</strong></span>
        <span><span className="text-text-muted">Supervising unit · </span><strong>{unit?.name ?? club.unitId}</strong></span>
        <span><span className="text-text-muted">Student manager · </span><strong>{club.managerName}</strong></span>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatTile label="Members" value={clubMemberCount(club)} hint={`${members.length} joined on CampusConnect`} />
        <StatTile label="Upcoming events" value={upcoming.filter(e => e.status === 'active').length} />
        <StatTile label="Registrations" value={clubRegs.filter(r => r.status !== 'rejected').length} hint="made on CampusConnect" />
        <StatTile label="Pending approvals" value={pending + requests.length} hint={`${requests.length} join · ${pending} event`} />
      </div>

      <Section title="Upcoming events" action={past.length > 0 && (
        <button className="text-sm font-semibold text-primary" onClick={() => setShowPast(s => !s)}>{showPast ? 'Hide' : 'Show'} past events ({past.length})</button>
      )}>
        <EventsTable events={upcoming} />
        {showPast && <div className="mt-4"><EventsTable events={past} /></div>}
      </Section>

      <div>
        <Section title={`Join requests (${requests.length})`} action={<Pill tone="amber">Students wait until you decide</Pill>}>
          {requests.length === 0 ? <EmptyState>No join requests right now.</EmptyState> : (
            <div className="flex flex-col gap-3" data-testid="join-requests">
              {requests.map(m => {
                const u = users.find(x => x.id === m.userId);
                return (
                  <Card key={m.userId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-join-request={m.userId}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-text">{u?.name ?? m.userId}</p>
                      <p className="text-xs text-text-muted">{u?.email} · requested {formatDate(m.joinedAt.slice(0, 10))}</p>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <Button variant="success" onClick={() => review(m.userId, 'approved')}>Approve</Button>
                        <Button variant="danger" onClick={() => review(m.userId, 'rejected')}>Decline</Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Section>

        <Section title={`Members (${clubMemberCount(club)})`}>
          <Card className="p-4">
            {members.length === 0 ? (
              <p className="text-sm text-text-muted">No students have joined through CampusConnect yet.</p>
            ) : (
              <ul className="divide-y divide-border" data-testid="club-members">
                {members.map(m => {
                  const u = users.find(x => x.id === m.userId);
                  return (
                    <li key={m.userId} className="py-2.5 flex items-center justify-between gap-3 text-sm flex-wrap" data-member={m.userId}>
                      <span><strong className="text-text">{u?.name ?? m.userId}</strong><span className="text-text-muted"> · {u?.email}</span></span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">member since {formatDate(m.joinedAt.slice(0, 10))}</span>
                        {canManage && <Button variant="ghost" onClick={() => setRemoving({ userId: m.userId, name: u?.name ?? m.userId })}>Remove</Button>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs text-text-muted mt-3">+ {club.memberCount} members from before CampusConnect (sample data).</p>
          </Card>
        </Section>

        <p className="text-sm text-text-muted">Your announcements and past/cancelled events are in the <a href="#/events" className="font-semibold text-primary">Events</a> section.</p>
      </div>

      <ConfirmDialog
        open={!!removing}
        title="Are you sure?"
        message={<>Remove <strong>{removing?.name}</strong> from {club.name}? They can send a new join request later.</>}
        confirmLabel="Remove member"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
