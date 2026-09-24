export const EVENT_CATEGORIES = [
  'Cultural & Social',
  'Sports & Gaming',
  'Hackathon & Showcase',
  'Workshop',
  'Guest Talk',
  'Career & Internship',
] as const;

export const CLUB_CATEGORIES = [
  'Arts & Culture',
  'Sports & Gaming',
  'Technology',
] as const;

export const ROLES = {
  STUDENT: 'student',
  CLUB_MANAGER: 'clubManager',
  FACULTY: 'faculty',
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  clubManager: 'Club Manager',
  faculty: 'Faculty / Admin',
};

// URL slug for each role's login page (/login/<slug>)
export const ROLE_SLUGS: Record<Role, string> = {
  student: 'student',
  clubManager: 'club-manager',
  faculty: 'faculty',
};

// Where each role lands after logging in
export const ROLE_HOME: Record<Role, string> = {
  student: '/dashboard',
  clubManager: '/manage',
  faculty: '/faculty',
};

export const HOST_TYPES = {
  CLUB: 'club',
  UNIT: 'unit',
} as const;

export const ALMOST_FULL_THRESHOLD = 5;

// SU5: every account uses an Atria email: name@atria.edu.in
export const ACCOUNT_EMAIL_DOMAIN = 'atria.edu.in';

// Rule 10a: a student may be a member of at most this many clubs at once
export const MAX_CLUBS_PER_STUDENT = 2;

export const REG_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];
export type ClubCategory = typeof CLUB_CATEGORIES[number];
export type Role = typeof ROLES[keyof typeof ROLES];
export type HostType = typeof HOST_TYPES[keyof typeof HOST_TYPES];
export type RegStatus = typeof REG_STATUS[keyof typeof REG_STATUS];
