import type { EventCategory, ClubCategory, HostType, Role, RegStatus } from '../lib/constants';

export interface AppEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  venue: string;
  description: string;
  seatsTotal: number;
  seatsTaken: number; // baseline seats taken by students outside this demo
  posterUrl: string;
  hostType: HostType;
  hostId: string;
  status: 'active' | 'cancelled';
  registrations: string[]; // sample names of earlier attendees (already confirmed)
  requiresApproval?: boolean; // registrations start as "pending" until the host accepts
}

export interface AppClub {
  id: string;
  name: string;
  category: ClubCategory;
  description: string;
  memberCount: number; // baseline members outside this demo
  unitId: string;
  managerName: string;
}

export interface AppUnit {
  id: string;
  name: string;
  description: string;
  facultyName: string;
}

export type UserStatus = 'approved' | 'pending' | 'declined';

// What the browser sees. Password hashes never leave the server.
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  clubId?: string; // club managers: the club they manage; faculty: the club they head
  active: boolean; // false = deactivated by faculty
  status: UserStatus; // self sign-ups for staff roles start as 'pending'
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: RegStatus;
  createdAt: string; // ISO timestamp
}

export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export interface Membership {
  userId: string;
  clubId: string;
  status: MembershipStatus; // join requests start 'pending' until the club's staff decide
  joinedAt: string; // when the request was sent
}

export interface Follow {
  userId: string;
  unitId: string;
}

export interface Announcement {
  id: string;
  clubId: string | null; // null = university-wide (faculty only)
  title: string;
  body: string;
  authorId: string;
  authorName?: string; // filled in by the server
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  role: Role;
  clubId?: string;
}
