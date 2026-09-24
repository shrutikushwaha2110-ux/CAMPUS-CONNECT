import { Link } from 'react-router';
import type { AppEvent } from '../data/types';
import { CategoryBadge } from './CategoryBadge';
import { SeatsBadge } from './SeatsBadge';
import { EventPoster } from './EventPoster';
import { seatsLeft, seatStatus } from '../lib/seats';
import { formatDate } from '../lib/date';

interface Props {
  event: AppEvent;
  localTaken?: number; // seats held by registrations made on this site
  hostName?: string;
  myStatus?: string; // the logged-in student's registration status, if any
}

export function EventCard({ event, localTaken = 0, hostName, myStatus }: Props) {
  const left = seatsLeft(event.seatsTotal, event.seatsTaken, localTaken);
  const status = seatStatus(event.seatsTotal, event.seatsTaken, localTaken, event.status);

  return (
    <Link
      to={`/events/${event.id}`}
      data-event-card={event.id}
      className="flex flex-col rounded-2xl overflow-hidden bg-white transition-all hover:-translate-y-0.5 no-underline"
      style={{
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(31,29,43,0.07), 0 4px 16px rgba(31,29,43,0.05)',
        opacity: event.status === 'cancelled' ? 0.6 : 1,
      }}
    >
      <EventPoster category={event.category} className="h-40 w-full" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CategoryBadge category={event.category} />
          <SeatsBadge status={status} seatsLeft={left} />
        </div>
        <h3 className="font-semibold text-base leading-snug" style={{ color: '#1F1D2B' }}>
          {event.title}
        </h3>
        {(hostName || myStatus) && (
          <p className="text-xs -mt-1 flex items-center gap-2 flex-wrap" style={{ color: '#454242' }}>
            {hostName && <span>by {hostName}</span>}
            {myStatus && (
              <span className="font-semibold" style={{ color: myStatus === 'rejected' ? '#991B1B' : myStatus === 'pending' ? '#78350F' : '#166534' }}>
                · {myStatus === 'confirmed' ? 'You’re registered' : myStatus === 'pending' ? 'Pending approval' : 'Registration rejected'}
              </span>
            )}
          </p>
        )}
        <div className="flex flex-col gap-1.5 text-sm mt-auto" style={{ color: '#454242' }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {formatDate(event.date)} · {event.time}
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            {event.venue}
          </div>
        </div>
      </div>
    </Link>
  );
}
