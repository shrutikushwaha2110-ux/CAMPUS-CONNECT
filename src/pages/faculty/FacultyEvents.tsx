// /faculty/events: every event on campus, filterable by host and status
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAppData } from '../../state/AppData';
import { getToday } from '../../lib/date';
import { EventsTable } from '../../components/staff';
import { ButtonLink, PageHeader, SelectInput } from '../../components/ui';

export function FacultyEvents() {
  const { events, clubs, units } = useAppData();
  const [host, setHost] = useState('');
  const [status, setStatus] = useState('upcoming');
  const today = getToday();

  const list = useMemo(() => events
    .filter(e => !host || `${e.hostType}:${e.hostId}` === host)
    .filter(e => status === 'all'
      || (status === 'upcoming' && e.status === 'active' && e.date >= today)
      || (status === 'cancelled' && e.status === 'cancelled')
      || (status === 'past' && e.date < today))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [events, host, status, today]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <Link to="/faculty" className="text-sm font-semibold text-primary">← Admin dashboard</Link>
      <div className="mt-4">
        <PageHeader eyebrow="Faculty / Admin" title="All events" subtitle="Create, edit or cancel any event and review its registrations."
          actions={<ButtonLink to="/manage/events/new">+ New event</ButtonLink>} />
      </div>
      <div className="flex gap-3 flex-wrap mb-6">
        <div className="w-full sm:w-64">
          <SelectInput aria-label="Filter by host" value={host} onChange={e => setHost(e.target.value)}>
            <option value="">All hosts</option>
            <optgroup label="Clubs">{clubs.map(c => <option key={c.id} value={`club:${c.id}`}>{c.name}</option>)}</optgroup>
            <optgroup label="Units">{units.map(u => <option key={u.id} value={`unit:${u.id}`}>{u.name}</option>)}</optgroup>
          </SelectInput>
        </div>
        <div className="w-full sm:w-48">
          <SelectInput aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="cancelled">Cancelled</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </SelectInput>
        </div>
      </div>
      <p className="text-sm text-text-muted mb-4">{list.length} events</p>
      <EventsTable events={list} showHost />
    </div>
  );
}
