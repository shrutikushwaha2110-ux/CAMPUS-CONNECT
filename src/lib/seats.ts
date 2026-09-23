import { ALMOST_FULL_THRESHOLD } from './constants';

// Seats left = seatsTotal − seatsTaken − registrations made in this site that still hold a seat
// (confirmed or pending; rejected ones give the seat back). SPEC §7 rule 2.
export function seatsLeft(seatsTotal: number, seatsTaken: number, localActive: number): number {
  return Math.max(0, seatsTotal - seatsTaken - localActive);
}

export type SeatStatus = 'available' | 'almost-full' | 'full' | 'cancelled';

export function seatStatus(
  seatsTotal: number,
  seatsTaken: number,
  localActive: number,
  eventStatus: string,
): SeatStatus {
  if (eventStatus === 'cancelled') return 'cancelled';
  const left = seatsLeft(seatsTotal, seatsTaken, localActive);
  if (left === 0) return 'full';
  if (left <= ALMOST_FULL_THRESHOLD) return 'almost-full';
  return 'available';
}
