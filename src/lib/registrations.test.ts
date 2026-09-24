import { describe, it, expect } from 'vitest';
import events from '../data/events.json';
import type { AppEvent, Registration } from '../data/types';
import { registerBlockReason, localActiveCount, initialStatus, reviewBlockReason } from './registrations';

const TODAY = '2026-11-01';
const ev = (id: string) => events.find(e => e.id === id) as AppEvent;
const reg = (eventId: string, userId: string, status: Registration['status'] = 'confirmed'): Registration =>
  ({ id: `${eventId}-${userId}`, eventId, userId, status, createdAt: '2026-11-01T10:00:00Z' });
const check = (id: string, role: string | null, userId: string | null, regs: Registration[] = []) =>
  registerBlockReason({ event: ev(id), role, userId, regs, taken: localActiveCount(id, regs), today: TODAY });

describe('who can register (rules 1, 3, 4, 6, 21)', () => {
  it('a logged-in student can register for any club event (membership not needed)', () => {
    expect(check('open-mic-evening', 'student', 'stu-shruti')).toBeNull();
  });
  it('a logged-out visitor is asked to log in', () => {
    expect(check('open-mic-evening', null, null)).toBe('login');
  });
  it('Club Managers and Faculty cannot register', () => {
    expect(check('open-mic-evening', 'clubManager', 'mgr-dance')).toBe('not-student');
    expect(check('open-mic-evening', 'faculty', 'fac-admin')).toBe('not-student');
  });
  it('rule 1: cannot register twice', () => {
    expect(check('open-mic-evening', 'student', 'stu-shruti', [reg('open-mic-evening', 'stu-shruti')])).toBe('already');
  });
  it('rule 6: cancelled event blocks', () => {
    expect(check('esports-night', 'student', 'stu-shruti')).toBe('cancelled');
  });
  it('rule 4: past event blocks', () => {
    expect(check('past-hackathon', 'student', 'stu-shruti')).toBe('past');
  });
  it('rule 3: full event blocks', () => {
    expect(check('twenty-four-hour-hackathon', 'student', 'stu-shruti')).toBe('full');
  });
  it('last seat taken by another student blocks the next one', () => {
    expect(check('dance-workshop', 'student', 'stu-raju', [reg('dance-workshop', 'stu-shruti')])).toBe('full');
  });
  it('a rejected registration frees the seat for someone else', () => {
    expect(check('dance-workshop', 'student', 'stu-raju', [reg('dance-workshop', 'stu-shruti', 'rejected')])).toBeNull();
  });
});

describe('seat accounting (rules 2, 22)', () => {
  it('confirmed and pending hold seats, rejected does not', () => {
    const regs = [reg('battle-of-bands', 'a'), reg('battle-of-bands', 'b', 'pending'), reg('battle-of-bands', 'c', 'rejected')];
    expect(localActiveCount('battle-of-bands', regs)).toBe(2);
  });
});

describe('approval flow (rule 23)', () => {
  it('events that require approval start as pending', () => {
    expect(initialStatus(ev('battle-of-bands'))).toBe('pending');
  });
  it('other events are confirmed straight away', () => {
    expect(initialStatus(ev('annual-dance-fest'))).toBe('confirmed');
  });
  it('accepting a pending registration is allowed', () => {
    const r = reg('battle-of-bands', 'a', 'pending');
    expect(reviewBlockReason(ev('battle-of-bands'), r, 'confirmed', [r])).toBeNull();
  });
  it('re-accepting a rejected registration needs a free seat', () => {
    const rejected = reg('dance-workshop', 'a', 'rejected');
    const other = reg('dance-workshop', 'b');
    expect(reviewBlockReason(ev('dance-workshop'), rejected, 'confirmed', [rejected, other])).toBe('full');
  });
  it('setting the same status is a no-op', () => {
    const r = reg('battle-of-bands', 'a', 'pending');
    expect(reviewBlockReason(ev('battle-of-bands'), r, 'pending', [r])).toBe('same');
  });
});
