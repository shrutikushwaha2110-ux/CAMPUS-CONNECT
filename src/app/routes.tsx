import { createHashRouter } from 'react-router';
import { Root } from '../pages/Root';
import { Home } from '../pages/Home';
import { Events } from '../pages/Events';
import { EventDetails } from '../pages/EventDetails';
import { Clubs } from '../pages/Clubs';
import { Units } from '../pages/Units';
import { Dashboard } from '../pages/Dashboard';
import { Login, RoleLogin } from '../pages/Login';
import { NotFound } from '../pages/NotFound';
import { ManageHome } from '../pages/manage/ManageHome';
import { EventForm } from '../pages/manage/EventForm';
import { EventRegistrations } from '../pages/manage/EventRegistrations';
import { AnnouncementForm } from '../pages/manage/AnnouncementForm';
import { FacultyHome } from '../pages/faculty/FacultyHome';
import { ManageClubs } from '../pages/faculty/ManageClubs';
import { ClubForm } from '../pages/faculty/ClubForm';
import { FacultyClubDetail } from '../pages/faculty/FacultyClubDetail';
import { FacultyEvents } from '../pages/faculty/FacultyEvents';
import { ManageUsers } from '../pages/faculty/ManageUsers';
import { FacultyAnnouncements } from '../pages/faculty/FacultyAnnouncements';
import { RequireRole } from '../components/RequireRole';
import type { Role } from '../lib/constants';
import type { ReactNode } from 'react';

// Every protected route is wrapped, so typing the URL never skips the role check (rule 17)
const only = (roles: Role[], el: ReactNode) => <RequireRole roles={roles}>{el}</RequireRole>;
const STAFF: Role[] = ['clubManager', 'faculty'];

// Hash routing so deep links like /#/events/999 work on any static host without rewrites
export const router = createHashRouter([
  { path: '/login', Component: Login },
  { path: '/login/:role', Component: RoleLogin },
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'events', Component: Events },
      { path: 'events/:id', Component: EventDetails },
      { path: 'clubs', Component: Clubs },
      { path: 'units', Component: Units },

      // Student
      { path: 'dashboard', element: only(['student'], <Dashboard />) },

      // Club Manager (own club) + Faculty (any): scope is re-checked inside each page
      { path: 'manage', element: only(['clubManager'], <ManageHome />) },
      { path: 'manage/events/new', element: only(STAFF, <EventForm />) },
      { path: 'manage/events/:id/edit', element: only(STAFF, <EventForm />) },
      { path: 'manage/events/:id/registrations', element: only(STAFF, <EventRegistrations />) },
      { path: 'manage/announcements/new', element: only(STAFF, <AnnouncementForm />) },
      { path: 'manage/announcements/:id/edit', element: only(STAFF, <AnnouncementForm />) },

      // Faculty / Admin
      { path: 'faculty', element: only(['faculty'], <FacultyHome />) },
      { path: 'faculty/clubs', element: only(['faculty'], <ManageClubs />) },
      { path: 'faculty/clubs/new', element: only(['faculty'], <ClubForm />) },
      { path: 'faculty/clubs/:id', element: only(['faculty'], <FacultyClubDetail />) },
      { path: 'faculty/clubs/:id/edit', element: only(['faculty'], <ClubForm />) },
      { path: 'faculty/events', element: only(['faculty'], <FacultyEvents />) },
      { path: 'faculty/users', element: only(['faculty'], <ManageUsers />) },
      { path: 'faculty/announcements', element: only(['faculty'], <FacultyAnnouncements />) },

      { path: '*', Component: NotFound },
    ],
  },
]);
