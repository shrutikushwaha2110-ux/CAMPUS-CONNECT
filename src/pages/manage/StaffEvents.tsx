// /events for staff (Club Manager + Faculty): only the events THEY host and their announcements.
// Why not the student list? Staff can't register, and they may only act on their own club's events
// (+ university/unit events for faculty), so every row here is one they can actually edit, cancel or review.
import { useMemo, useState } from 'react';
import { useAppData } from '../../state/AppData';
import { canManageEvent, canManageAnnouncement, isFaculty } from '../../lib/permissions';
import { getToday } from '../../lib/date';
import { AnnouncementsList, EventsTable } from '../../components/staff';
import { ButtonLink, PageHeader, Section } from '../../components/ui';

export function StaffEvents() {
  const { session, events, clubs, announcements } = useAppData();
  const [showPast, setShowPast] = useState(false);
  const today = getToday();
  const club = clubs.find(c => c.id === session?.clubId);
  const faculty = isFaculty(session);

  const mine = useMemo(
    () => events.filter(e => canManageEvent(session, e)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [events, session],
  );
  const clubEvents = mine.filter(e => e.hostType === 'club');
  const unitEvents = mine.filter(e => e.hostType === 'unit');
  const upcoming = (list: typeof mine) => list.filter(e => e.date >= today && e.status === 'active');
  const pastOrCancelled = clubEvents.filter(e => e.date < today || e.status === 'cancelled');
  const myAnnouncements = announcements.filter(a => canManageAnnouncement(session, a));

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12" data-testid="staff-events">
      <PageHeader
        eyebrow={faculty ? 'Faculty · Events' : 'Club Manager · Events'}
        title={`${club?.name ?? 'My club'} events`}
        subtitle={faculty
          ? 'Events hosted by the club you head, university (unit) events you look after, and your announcements.'
          : 'Events hosted by your club, and your club announcements.'}
        actions={<>
          <ButtonLink to="/manage/events/new">+ New event</ButtonLink>
          <ButtonLink variant="secondary" to="/manage/announcements/new">+ Announcement</ButtonLink>
        </>}
      />

      <Section title={`Current hosted events (${upcoming(clubEvents).length})`}>
        <EventsTable events={upcoming(clubEvents)} />
      </Section>

      {faculty && (
        <Section title={`University (unit) events (${upcoming(unitEvents).length})`}>
          <EventsTable events={upcoming(unitEvents)} showHost />
        </Section>
      )}

      <Section title="Announcements">
        <AnnouncementsList items={myAnnouncements} showScope={faculty} />
      </Section>

      {pastOrCancelled.length > 0 && (
        <Section title="Past & cancelled" action={
          <button className="text-sm font-semibold text-primary" onClick={() => setShowPast(s => !s)}>{showPast ? 'Hide' : `Show (${pastOrCancelled.length})`}</button>
        }>
          {showPast && <EventsTable events={pastOrCancelled} />}
        </Section>
      )}
    </div>
  );
}
