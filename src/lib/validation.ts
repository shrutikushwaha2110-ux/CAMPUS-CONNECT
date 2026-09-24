// Form validation rules for staff forms (SPEC §7 rules 14, 15, 19; requirements O2, O5, C2)
import { EVENT_CATEGORIES, CLUB_CATEGORIES } from './constants';
import { getToday } from './date';

export type Errors = Record<string, string>;

export interface EventInput {
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  seatsTotal: number;
}

// seatsTakenNow includes the demo student's registration (rule 15); 0 for a new event
export function validateEvent(input: EventInput, seatsTakenNow = 0, today = getToday()): Errors {
  const errors: Errors = {};
  if (!input.title.trim()) errors.title = 'Title is required';
  if (!(EVENT_CATEGORIES as readonly string[]).includes(input.category)) errors.category = 'Pick a category';
  if (!input.date) errors.date = 'Date is required';
  else if (input.date < today) errors.date = 'Date cannot be in the past';
  if (!input.time) errors.time = 'Time is required';
  if (!input.venue.trim()) errors.venue = 'Venue is required';
  if (!input.description.trim()) errors.description = 'Description is required';
  if (!Number.isFinite(input.seatsTotal) || input.seatsTotal < 1) errors.seatsTotal = 'Seats must be at least 1';
  else if (input.seatsTotal < seatsTakenNow) errors.seatsTotal = `Seats cannot be lower than the ${seatsTakenNow} already taken`;
  return errors;
}

export interface AnnouncementInput {
  title: string;
  body: string;
}

// M5 / F5a: announcements need a title (≤ 80 chars) and a message
export function validateAnnouncement(input: AnnouncementInput): Errors {
  const errors: Errors = {};
  if (!input.title.trim()) errors.title = 'Title is required';
  else if (input.title.trim().length > 80) errors.title = 'Keep the title under 80 characters';
  if (!input.body.trim()) errors.body = 'Message is required';
  return errors;
}

export interface UserInput {
  id?: string; // set when editing
  name: string;
  email: string;
  role: string;
  clubId?: string;
  password?: string; // required for new users
}

// U1: faculty manages users. Email unique (case-insensitive); Club Managers and Faculty must be assigned to an existing club.
export function validateUser(
  input: UserInput,
  existing: Array<{ id: string; email: string }>,
  liveClubIds: Set<string>,
): Errors {
  const errors: Errors = {};
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) errors.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
  else if (existing.some(u => u.id !== input.id && u.email.toLowerCase() === email)) errors.email = 'Another account already uses this email';
  if (!['student', 'clubManager', 'faculty'].includes(input.role)) errors.role = 'Pick a role';
  // Club Managers manage one club; Faculty head one club (rule 26)
  if ((input.role === 'clubManager' || input.role === 'faculty') && (!input.clubId || !liveClubIds.has(input.clubId))) {
    errors.clubId = input.role === 'faculty' ? 'Assign the faculty member to the club they head' : 'Assign the manager to a club';
  }
  if (!input.id && (!input.password || input.password.length < 6)) errors.password = 'Password must be at least 6 characters';
  return errors;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  confirm: string;
  role: string;
  clubId?: string;
}

// SU1: public sign-up. Stronger password than faculty-created temporary ones (8+ chars, letters + numbers).
// `openHeadClubs` = clubs with no approved faculty head (the only ones a Faculty sign-up may request).
export function validateSignup(
  input: SignupInput,
  existing: Array<{ email: string }>,
  liveClubIds: Set<string>,
  openHeadClubs: Set<string>,
): Errors {
  const errors: Errors = {};
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) errors.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
  else if (existing.some(u => u.email.toLowerCase() === email)) errors.email = 'An account with this email already exists. Log in instead.';
  if (input.password.length < 8 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
    errors.password = 'Use at least 8 characters with letters and numbers';
  }
  if (input.confirm !== input.password) errors.confirm = 'Passwords do not match';
  if (!['student', 'clubManager', 'faculty'].includes(input.role)) errors.role = 'Pick a role';
  if (input.role === 'clubManager' && (!input.clubId || !liveClubIds.has(input.clubId))) errors.clubId = 'Pick the club you manage';
  if (input.role === 'faculty' && (!input.clubId || !openHeadClubs.has(input.clubId))) errors.clubId = 'Pick a club that has no faculty head yet';
  return errors;
}

export interface ClubInput {
  id?: string; // set when editing, so the club doesn't clash with its own name
  name: string;
  category: string;
  description: string;
  managerName: string;
}

export function validateClub(input: ClubInput, existing: Array<{ id: string; name: string }>): Errors {
  const errors: Errors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Club name is required';
  // Rule 19: names are unique ignoring capital letters
  else if (existing.some(c => c.id !== input.id && c.name.trim().toLowerCase() === name.toLowerCase())) {
    errors.name = 'A club with this name already exists';
  }
  if (!(CLUB_CATEGORIES as readonly string[]).includes(input.category)) errors.category = 'Pick a club category';
  if (!input.description.trim()) errors.description = 'Description is required';
  if (!input.managerName.trim()) errors.managerName = 'Student manager name is required';
  return errors;
}
