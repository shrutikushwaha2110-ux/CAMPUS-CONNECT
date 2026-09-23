// Event registration rules (SPEC §7 rules 1–6, 21–23)
import type { AppEvent, Registration } from '../data/types';
import { REG_STATUS, type RegStatus } from './constants';
import { seatsLeft } from './seats';

// Confirmed and pending registrations hold a seat; rejected ones don't (rule 22)
export const holdsSeat = (r: Registration) => r.status !== REG_STATUS.REJECTED;

export function localActiveCount(eventId: string, regs: Registration[]): number {
  return regs.filter(r => r.eventId === eventId && holdsSeat(r)).length;
}

export function findRegistration(eventId: string, userId: string, regs: Registration[]): Registration | undefined {
  return regs.find(r => r.eventId === eventId && r.userId === userId);
}

export type RegisterBlock = 'login' | 'not-student' | 'already' | 'cancelled' | 'past' | 'full' | null;

// Why a user can't register, or null if they can. Club membership is NOT required (rule 21).
export function registerBlockReason(args: {
  event: AppEvent;
  role: string | null;
  userId: string | null;
  regs: Registration[];
  today: string;
}): RegisterBlock {
  const { event, role, userId, regs, today } = args;
  if (!role || !userId) return 'login';
  if (role !== 'student') return 'not-student';
  if (findRegistration(event.id, userId, regs)) return 'already'; // rule 1 (also blocks re-applying after a rejection)
  if (event.status === 'cancelled') return 'cancelled'; // rule 6
  if (event.date < today) return 'past'; // rule 4
  if (seatsLeft(event.seatsTotal, event.seatsTaken, localActiveCount(event.id, regs)) === 0) return 'full'; // rule 3
  return null;
}

// New registrations are pending when the host must approve them (rule 23)
export function initialStatus(event: AppEvent): RegStatus {
  return event.requiresApproval ? REG_STATUS.PENDING : REG_STATUS.CONFIRMED;
}

export type ReviewBlock = 'same' | 'full' | null;

// Accepting a rejected registration needs a free seat again; rejecting always frees one
export function reviewBlockReason(event: AppEvent, reg: Registration, next: RegStatus, regs: Registration[]): ReviewBlock {
  if (reg.status === next) return 'same';
  const reclaimsSeat = reg.status === REG_STATUS.REJECTED && next !== REG_STATUS.REJECTED;
  if (reclaimsSeat && seatsLeft(event.seatsTotal, event.seatsTaken, localActiveCount(event.id, regs)) === 0) return 'full';
  return null;
}
