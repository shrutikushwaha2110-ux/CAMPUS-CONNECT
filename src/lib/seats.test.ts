import { describe, it, expect } from 'vitest';
import { seatsLeft, seatStatus, seatsFilled, seatsTakenNow, unnamedEarlierSeats } from './seats';

describe('staff seat figures (O5, O7, O8)', () => {
  it('seats taken now = baseline + site registrations', () => {
    expect(seatsTakenNow(80, 2)).toBe(82);
  });
  it('seats filled never exceeds the total', () => {
    expect(seatsFilled(30, 29, 5)).toBe(30);
    expect(seatsFilled(120, 80, 1)).toBe(81);
  });
  it('unnamed earlier seats never goes negative', () => {
    expect(unnamedEarlierSeats(80, 4)).toBe(76);
    expect(unnamedEarlierSeats(0, 2)).toBe(0);
  });
});

describe('seatsLeft (rule 2)', () => {
  it('subtracts seats taken from total', () => {
    expect(seatsLeft(120, 80, 0)).toBe(40);
  });
  it('subtracts registrations made on this site', () => {
    expect(seatsLeft(120, 80, 3)).toBe(37);
  });
  it('never goes below zero', () => {
    expect(seatsLeft(80, 80, 1)).toBe(0);
  });
});

describe('seatStatus (F11, rules 3, 7)', () => {
  it('is "available" with more than 5 seats left', () => {
    expect(seatStatus(120, 80, 0, 'active')).toBe('available');
  });
  it('is "almost-full" at exactly 5 seats left', () => {
    expect(seatStatus(30, 25, 0, 'active')).toBe('almost-full');
  });
  it('is "almost-full" at 1 seat left (last-seat event)', () => {
    expect(seatStatus(30, 29, 0, 'active')).toBe('almost-full');
  });
  it('becomes "full" after a student takes the last seat (F6 last seat)', () => {
    expect(seatStatus(30, 29, 1, 'active')).toBe('full');
  });
  it('is "full" when seatsTaken equals seatsTotal (F6)', () => {
    expect(seatStatus(80, 80, 0, 'active')).toBe('full');
  });
  it('is "cancelled" for a cancelled event even with seats left (F14)', () => {
    expect(seatStatus(60, 20, 0, 'cancelled')).toBe('cancelled');
  });
});
