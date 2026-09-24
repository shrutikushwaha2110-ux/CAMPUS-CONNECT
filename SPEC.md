# CampusConnect: Spec

**Team:** Shruti (Figma design) · Raju (student pages & logic) · Sohail (staff pages)
**Design source:** Figma Make file "Add Logo and Name" (`ej75XJhPL0fvejEo92cI3I`)
**Version:** v3 (2026-09-24): SQLite database + Node API, sign-up with hashed passwords, approval of staff sign-ups. v2.1 (2026-09-24): staff sections trimmed; each faculty member heads ONE club. v2 (2026-09-23): three roles with separate logins and dashboards. v1: single demo student.

> This file is the source of truth. The team writes it; Claude may help think it through. A Claude Code hook blocks edits to it unless the team lists it in `.claude/hooks/approved-edits.txt` (see CLAUDE.md → Hooks).

## 1. Purpose

CampusConnect is a **3D event-management website** for Atria University. Students find events, register for any of them and join clubs. Club Managers run one club: its events, registrations, members and announcements. Each Faculty member heads one club, looks after university (unit) events, manages student and own-club accounts, and sees campus-wide statistics. Three.js adds purposeful depth and motion without getting in the way of the tasks.

## 2. Who the visitors are (roles)

The university has **units** (e.g. Digital Transformation) that **supervise** clubs. Clubs and units **host** events.

| Role | Logs in at | Lands on | Can do |
|---|---|---|---|
| **Visitor** (not logged in) | n/a | any public page | Browse events, clubs, units. Asked to log in as a student to register, join or follow. |
| **Student** | `/login/student` | `/dashboard` | See **all** events and clubs. Register for **any** event, whatever club hosts it; club membership is not required. Join **at most 2 clubs**. Follow units. See their registrations (with status), clubs, announcements and upcoming events. |
| **Club Manager** | `/login/club-manager` | `/manage` | Assigned to exactly **one** club. The navbar has **only two sections: "Manage club" and "Events"** (Home, Clubs and Units redirect to `/manage`). *Manage club*: club info, members, upcoming events (edit / cancel / registrations with accept-reject), + New event, + Announcement. *Events*: the same page and UI students use, showing only the club's upcoming hosted events, with its announcements below. Can never open another club's event or management data. Cannot register for events or manage clubs/users. |
| **Faculty / Admin** | `/login/faculty` | `/faculty` | **Head of ONE club** (`clubId`). Navbar: Admin · My club · Events · Clubs · Users (no Units). Manages **only their own club** (view members & events, edit, delete) plus **university/unit-hosted events** (units are run by faculty, not clubs). May **add new clubs**. Users: add/edit/deactivate **students** and **their own club's managers**; may create a faculty head for a club that has none; can **never edit or deactivate another faculty member**. Announcements: university-wide or their own club. The admin dashboard shows campus-wide statistics (read-only). |

Each role has its **own login page** and **own dashboard**. An account can only sign in on the page for its role. Accounts live in the **database** (`users` table) with **salted scrypt password hashes**. Anyone can **sign up** (`/signup`): Students can use the site at once; Club Manager and Faculty sign-ups stay **pending** until approved (Club Manager → by that club's faculty head; Faculty → by any faculty member, only for a club with no head). The seeded demo accounts use `demo123` (students, managers) and `admin123` (faculty).

Using one browser for every role is on purpose: in the viva you can register as a student, log in as that club's manager, and immediately see the registration.

## 3. Stack

- React 19 + Vite + **TypeScript**, React Router **hash router** (`/#/events/…`)
- **Three.js** for the Home hero only (lazy-loaded)
- Tailwind CSS v4 with the Figma colour tokens
- **Backend:** Node + Express API (`server/app.ts`) with a **SQLite** database (Node's built-in `node:sqlite`) at `server/data/campusconnect.db`, seeded from `src/data/*.json` on first run. In development the API runs inside the Vite dev server (`/api/*`); in production `npm start` serves the API + `dist/` on one port.
- **Sessions:** random token in an `httpOnly` cookie; the DB stores only its SHA-256. Passwords are hashed with salted scrypt and never returned by the API.
- One browser store (`src/state/AppData.tsx`) loads `/api/state` (already filtered to what the role may see) and calls the API for every change; all rules are pure functions in `src/lib/`, used by **both** the browser and the server
- Tests: Vitest (rules), `npm run test:e2e` (real browser, every role), `npm run test:hooks`, manual log in `TESTS.md`

## 3A. 3D design and UX requirements

- The Home hero has an interactive Three.js scene that reacts subtly to the pointer.
- Essential tasks never need the 3D object. Navigation, forms, filters, buttons and management controls are normal accessible HTML.
- Phone width (~375 px) and desktop both work. Mobile uses a lighter scene (4 shapes, no particles).
- **`prefers-reduced-motion`**: the scene draws one static frame and stops its animation loop. It reacts live when the OS setting changes, and CSS hover/transition motion is switched off.
- If WebGL is unavailable, the page renders normally without the canvas.

## 4. Pages

### Public
| Page | Route | Contents |
|---|---|---|
| Home | `/` | 3D hero + search, featured event, upcoming events, popular clubs, units strip |
| Events | `/events` | **One page, same UI for every role** (title, search, category chips, date filter, event cards). Students & visitors: all upcoming events + your status. **Staff: only the events they host** (+ unit events for faculty), with their announcements below. No host filter when only one host |
| Event Details | `/events/:id` | Poster, date/time, venue, host link, description, seats, "open to all students" note, role-aware registration card |
| Clubs | `/clubs` | Club cards, category filter, member count, supervising unit, upcoming club events, Join/Joined/Limit reached, **the two student rules** |
| Units | `/units` | Unit cards, faculty head, supervised clubs, Follow |
| Not Found | anything else | "We couldn't find that page" + back to events |

### Login
| Page | Route | Contents |
|---|---|---|
| Choose login | `/login` | Three cards: Student, Club Manager, Faculty/Admin |
| Role login | `/login/student`, `/login/club-manager`, `/login/faculty` | Email + password (checked by the server), what the role can do, demo account hint, "Sign up" link |
| Sign up | `/signup` | Role choice (Student / Club Manager / Faculty), name, email, club (staff only; faculty: clubs without a head), password + confirm. Student → logged in; staff → "Request sent, waiting for approval" |

### Student (role `student`)
| Page | Route | Contents |
|---|---|---|
| Student dashboard | `/dashboard` | Rules banner, stats (upcoming registrations, clubs x/2, units, campus events), my registered events with status (Confirmed / Pending approval / Rejected / Cancelled by organiser), upcoming events for you (your clubs first), my clubs with Leave, announcements (university + my clubs), followed units |

### Club Manager (role `clubManager`, own club only; navbar = Manage club + Events)
| Page | Route | Contents |
|---|---|---|
| Manage club | `/manage` | Club info, stats (members, upcoming events, registrations, pending), upcoming events with seats filled + Registrations / Edit / Cancel, + New event, + Announcement, members list |
| Events | `/events` | The student Events UI showing only the club's upcoming hosted events (cards open the event page with "Manage registrations"), then the club's announcements (edit / delete). Edit / cancel / past events are in Manage club |
| New / edit event | `/manage/events/new`, `/manage/events/:id/edit` | Form: title, category, host (locked to own club), date, time, venue, seats, description, "needs approval" |
| Registrations | `/manage/events/:id/registrations` | Seats filled, confirmed/pending/rejected counts, students with Accept / Reject, earlier sample attendees |
| New / edit announcement | `/manage/announcements/new`, `/manage/announcements/:id/edit` | Title + message; audience locked to own club |

### Faculty / Admin (role `faculty`)
| Page | Route | Contents |
|---|---|---|
| Admin dashboard | `/faculty` | Stats (clubs, events, registrations, pending, users), links to the 4 areas, needs-attention list, latest announcements |
| My club | `/faculty/clubs` | The club they head: View members & events / Edit / Delete · + Add club |
| Club view | `/faculty/clubs/:id` | Own club only: the same view its manager sees, + Edit club info |
| Add / edit club | `/faculty/clubs/new`, `/faculty/clubs/:id/edit` | Name, category, supervising unit, description, student manager name |
| Events | `/events` (also `/faculty/events`) | The student Events UI with own club's events + university (unit) events (host filter: own club + units), then own/university announcements |
| Users | `/faculty/users` | All accounts listed; Edit / Deactivate only for students and own club's managers; other faculty shown as "Protected"; Add user |
| Announcements | `/faculty/announcements` | All announcements (read); New (university-wide or own club); Edit / Delete only their own club's and university-wide ones |
| (shared) | `/manage/events/*`, `/manage/announcements/*` | Faculty use the same forms/registrations pages, limited to their own club + unit events |

**Staff Events = student UI, staff scope:** the page looks exactly like the students' Events page (one component, one design). The *content* is scoped: staff can't register, and may only act on their own club's events (+ unit events for faculty), so they see only those. Actions (edit, cancel, registrations) are one click away via the event page or Manage club.

A logged-out visitor opening a role page is sent to that role's login (and returned afterwards). A logged-in user on another role's page sees **"Not available for your role"** with "Go to my dashboard" and "Switch role"; they never see the form or data.

## 5. Requirements

Every ID has at least one test case in `TESTS.md` / `docs/E2E_RESULTS.md`.

### Access (all roles)
| ID | Requirement |
|---|---|
| A1 | Separate login page per role; an account only signs in on its own role's page; wrong password / deactivated account / manager without an active club are refused with a message; session survives refresh; active user + role shown in the navbar; Log out / switch role any time |
| R17 | Role pages are protected by the session, not by hiding links: typing a restricted URL shows "Not available for your role" or redirects to login. **The API enforces every rule again**, so direct requests can't bypass the pages |
| SU1 | Anyone can create an account at `/signup` (name, email, password 8+ chars with letters and numbers, typed twice, role, club for staff). Email must be unique. A new Student is logged in straight away and can log in again later with the same email + password |
| SU2 | Club Manager / Faculty sign-ups are **pending**: login is refused with "waiting for approval" until a faculty member approves them in Users → Sign-up requests (Club Manager: that club's head; Faculty: any faculty, for a club with no head) |
| SU3 | A declined sign-up cannot log in |
| SU5 | Every account email must end with **`@atria.edu.in`** (checked in the sign-up form, the Users form and again by the server; case-insensitive; look-alikes such as `@atria.edu.in.com` are refused) |
| SU4 | Passwords are stored only as salted hashes; the API never sends passwords or hashes to the browser; wrong email and wrong password give the same message |

### Student
| ID | Requirement |
|---|---|
| S1 | A student sees all events and all clubs |
| F1 | Upcoming events, soonest first, past ones hidden |
| F2 | Keyword search over title, category and host name |
| F3 | Filter by category, date (next 7 / 30 days) and host |
| F4 | Event details incl. host |
| F5 | Register for an event; status shown; persists after refresh |
| F5a | Register for **any** club's event without being a member |
| F6 | Blocked when full ("Event Full") |
| F7 | Cancel own registration after "Are you sure?"; seat freed |
| F8 | Browse clubs, filter by category |
| F9 | Join / leave a club; member count ±1; leave asks "Are you sure?" |
| F9a | **Join at most 2 clubs**: third Join shows "Limit reached" (disabled); both rules are written on the Clubs page and dashboard: "You can join a maximum of 2 clubs." and "You can attend/register for events from any club." |
| F10 | Student dashboard: registrations with status, joined clubs (x/2), upcoming events for you, announcements, followed units, empty states |
| F11 | Seats badge: "N seats left" / "Almost full" (1–5) / "Full" / "Cancelled" |
| F12 | Confirmation toast after register, cancel, join, leave, follow, unfollow and every staff action |
| F13 | Friendly empty/not-found states (no results, empty dashboard, `/events/999`, unknown route) |
| F14 | An event cancelled by staff shows "Cancelled" on its page and **"Cancelled by organiser" on the student dashboard**; registering is blocked |
| F15 | Units list with faculty head |
| F16 | Follow / unfollow a unit |
| F17 | A club deleted by Faculty/Admin disappears from the Clubs page and from students' dashboards; its membership slot is freed |

### Club Manager
| ID | Requirement |
|---|---|
| M1 | Sees only their own club's management info (dashboard, members, registrations, announcements). Another club's URLs, including another club's event page, are blocked. |
| M6 | Navbar shows only **Manage club** and **Events**; `/`, `/clubs`, `/units` redirect to `/manage`; Events lists only the club's hosted events + announcements |
| M2 | Club dashboard shows club info, members, upcoming events with seats filled, pending approvals |
| M3 | Registrations page lists students; **Accept / Reject**. Events marked "needs approval" start registrations as Pending. Rejecting frees the seat; re-accepting needs a free seat. |
| M5 | Create / edit / delete announcements for their own club; members see them on their dashboard |
| O1 | Create an event (host locked to own club); appears on Events |
| O2 | Invalid form (required field empty, seats < 1, past date) shows errors and creates nothing |
| O3 | Edit own events; change visible on student pages |
| O4 | Blocked from editing / cancelling other clubs' events |
| O5 | Can't set seats below seats already taken |
| O6 | Cancel an event after "Are you sure?" → F14 |
| O7 | Seats filled per event |
| O8 | Registered students listed, incl. registrations made in the same browser |

### Faculty / Admin
| ID | Requirement |
|---|---|
| FA1 | Admin dashboard with system stats and links to all management areas |
| O3f | Create / edit / cancel events of **the club they head** and **university/unit** events; other clubs' events are blocked |
| C1 | Add a club (name, category, unit, description, manager name); appears on Clubs |
| C2 | Invalid club form (empty field, duplicate name ignoring case) shows errors, creates nothing |
| C3 | Edit **their own** club; change visible on Clubs; other clubs' edit URLs blocked |
| C4 | Delete **their own** club after "Are you sure?" (dialog states how many events will be cancelled): club hidden, upcoming events cancelled, memberships removed, its manager **and faculty head** can no longer log in |
| C6 | View their own club's management view (`/faculty/clubs/:id`) |
| U1 | Manage users: add students; add club managers **only for their own club**; add a faculty head only for a club without one; edit students / own club's managers; emails unique |
| U2 | Deactivate / reactivate students and own club's managers after "Are you sure?"; a deactivated user can't log in and an open session ends; faculty can't deactivate or demote themselves |
| U3 | A faculty member can **never edit or deactivate another faculty member's account** (shown as "Protected") |
| AN1 | University-wide announcements (all students) and announcements for their own club |

### Whole site
| ID | Requirement |
|---|---|
| N1 | Every page (all roles) works at 375 px with no sideways scroll |
| N2 | Footer notice "Unofficial student project. Clubs and events are sample data." on every page |
| N3 | Purposeful Three.js hero; all essential content is HTML |
| N4 | Reduced motion → static 3D frame, no animation loop, no CSS motion; no WebGL → page still works |

## 6. Data

**Event:** `id, title, category, date, time, venue, description, seatsTotal, seatsTaken, posterUrl, hostType (club|unit), hostId, status (active|cancelled), registrations (sample attendee names), requiresApproval?`
**Club:** `id, name, category, description, memberCount (baseline), unitId, managerName`
**Unit:** `id, name, description, facultyName`
**User:** `id, name, email (unique, case-insensitive), password_hash (server only), role (student|clubManager|faculty), clubId? (club managers: the club they manage; faculty: the club they head), active, status (approved|pending|declined), createdAt`
**Announcement:** `id, clubId (null = university-wide), title, body, authorId, createdAt, updatedAt`
**Registration:** `id, eventId, userId, status (confirmed|pending|rejected), createdAt`
**Membership:** `userId, clubId, joinedAt` · **Follow:** `userId, unitId`
**Session:** `sessions` table (token hash, user, expiry, 7 days) + `cc_session` httpOnly cookie. The API turns it into `{ userId, role, clubId? }` and re-validates it on every request.

**Database tables (SQLite):** `users`, `sessions`, `units`, `clubs` (+ `deleted` flag), `events`, `registrations` (unique per event + user), `memberships`, `follows`, `announcements` (+ `deleted` flag). Deleted clubs/announcements are marked, never erased. Nothing is kept in localStorage any more.

**What each role receives from `/api/state`:** everyone gets events, clubs, units, announcements, and per-event seat counts + per-club member counts. Students get only their own registrations/memberships/follows and their own user record. Club Managers also get their club's members and its events' registrations (with those students' names). Faculty get all users, registrations and memberships.

**Categories:** Cultural & Social, Sports & Gaming, Hackathon & Showcase, Workshop, Guest Talk, Career & Internship. **Club categories:** Arts & Culture, Sports & Gaming, Technology.

### Seed data (designed so every rule can be demoed)
| Demo need | Seed |
|---|---|
| Full event (F6) | `twenty-four-hour-hackathon` (80/80) |
| 1 seat left / last seat | `dance-workshop` (29/30) |
| Past event (rule 4) | `past-hackathon` |
| Cancelled event | `esports-night` |
| Needs approval (M3) | `battle-of-bands` (Music Club), `maker-tools-workshop` (Beyonder Studios) |
| Search/register demo | `annual-dance-fest` (Dance Club) |
| Accounts | 4 students, 1 manager per club (6), 1 faculty head per club (6; `admin@atria.edu.in` heads Dance, `meera.nair@` Music, `vikram.shah@` Hackathon…): see `users.json` |
| Announcements | 1 university-wide, 1 Dance Club, 1 Music Club |

Reset the demo: `npm run db:reset` (wipes the database and re-seeds it; all sign-ups are lost).

## 7. Rules

**Registration**
1. A student can register for an event only once (a rejected registration can't simply be re-submitted).
2. Seats left = `seatsTotal − seatsTaken − site registrations that hold a seat`.
3. 0 seats left → "Event Full", registering blocked.
4. Past event → "Event Passed", blocked.
5. Cancelling your registration removes it and frees the seat.
6. Cancelled event → blocked.
7. "Almost full" when 1–5 seats are left.
21. **Club membership is never required to register.**
22. Confirmed and pending registrations hold a seat; rejected ones don't.
23. `requiresApproval` events start registrations as **pending**; the host accepts or rejects. Accepting a rejected registration again needs a free seat.
24. Only students register; Club Managers / Faculty see "Only students can register" (plus "Manage registrations" if it's their event).

**Lists**
8. Events list: upcoming only, soonest first.
9. No matches → empty state, not a blank page.

**Clubs**
10. Join once; shown count = `memberCount` + site members.
10a. **A student can be a member of at most 2 clubs** (deleted clubs don't count).
11. Leaving lowers the count by one.

**Permissions**
12. Club Manager: create/edit/cancel only events hosted by their own club. Faculty: events of the club they head + university/unit events. Nobody else's.
13. Club Manager's new events are hosted by their club (locked). Faculty choose their own club or a unit.
14. Event form: title, category from the list, date ≥ today, time, venue, description, seats ≥ 1.
15. Seats can't go below seats already taken.
16. Cancelling an event sets `status: cancelled`; it's never deleted.
17. Access is checked from the session on every protected route and again inside pages that show one club's or event's private data.
18. Any faculty member may add a club; only its faculty head may edit or delete it. Only faculty manage users.
19. Club name unique (case-insensitive); category, description, manager name required.
20. Deleting a club hides it, cancels its **upcoming** events (past ones stay), removes memberships, and invalidates its manager's and faculty head's logins.
25. Announcements: Club Managers only for their own club; Faculty for their own club or university-wide. Title ≤ 80 chars and message required.
26. Users: unique email (case-insensitive); managers and faculty must be assigned to an existing club; a faculty member may only assign managers to their own club and new faculty heads to clubs without one; may edit/deactivate students and own-club managers only, **never another faculty member**; new accounts need a ≥ 6-char password; deactivated users can't log in; nobody can deactivate or demote themselves.
27. Staff (Club Managers, Faculty) only see and open events they may manage; Club Managers have no Home / Clubs / Units pages and Faculty have no Units page.

## 8. Test case format

| Feature | Input tried | Expected | Actual | Pass/Fail |
|---|---|---|---|---|

"Actual" is filled in only after really running it. `npm run test:e2e` writes this table automatically to `docs/E2E_RESULTS.md`.

## 9. Definition of done

A requirement is done when: its rule is in `src/lib/` with Vitest tests, it is exercised in the real browser (e2e or by hand) with the real result recorded, it works at 375 px, `npm run build` passes, and each of us can explain it without Claude.
