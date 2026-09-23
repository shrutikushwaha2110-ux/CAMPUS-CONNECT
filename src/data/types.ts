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

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // demo only, NOT real security: this is a front-end-only prototype
  role: Role;
  clubId?: string; // only for club managers
  active: boolean;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: RegStatus;
  createdAt: string; // ISO timestamp
}

export interface Membership {
  userId: string;
  clubId: string;
  joinedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  role: Role;
  clubId?: string;
}
