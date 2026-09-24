import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { useAppData } from '../state/AppData';
import { ROLE_HOME, ROLE_LABELS, ROLE_SLUGS, type Role } from '../lib/constants';
import logoImg from '../assets/logo2.png';

const ROLE_INFO: Record<Role, { icon: string; blurb: string; can: string[]; demo: { email: string; password: string; note?: string } }> = {
  student: {
    icon: '🎓',
    blurb: 'Browse events and clubs, register for events, join up to 2 clubs.',
    can: ['Register for any event, from any club', 'Join a maximum of 2 clubs', 'See your registrations and announcements'],
    demo: { email: 'shruti@student.atria.edu', password: 'demo123', note: 'Also: raju@, sohail@, ananya@student.atria.edu' },
  },
  clubManager: {
    icon: '🏛️',
    blurb: 'Manage one club: its events, members, registrations and announcements.',
    can: ['See only your own club’s management data', 'Create, edit and cancel your club’s events', 'Accept or reject registrations', 'Post club announcements'],
    demo: { email: 'dance.manager@atria.edu', password: 'demo123', note: 'Also: music., literature., sports., esports., hackathon.manager@atria.edu' },
  },
  faculty: {
    icon: '🔬',
    blurb: 'Head one club, look after university events, and manage student and club accounts.',
    can: ['Manage the club you head + university (unit) events', 'Add new clubs', 'Approve sign-ups, manage students and your club managers', 'University-wide announcements'],
    demo: { email: 'admin@atria.edu', password: 'admin123' },
  },
};

const slugToRole = Object.fromEntries(Object.entries(ROLE_SLUGS).map(([r, s]) => [s, r])) as Record<string, Role>;

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: '#F7F7FC' }}>
      <Link to="/" className="flex items-center gap-3 mb-10">
        <img src={logoImg} alt="CampusConnect" className="w-10 h-10 rounded-xl" />
        <span className="font-bold text-xl" style={{ color: '#1C1750' }}>CampusConnect</span>
      </Link>
      {children}
      <p className="mt-8 text-xs text-center" style={{ color: '#64748b' }}>
        Unofficial student project. Clubs and events are sample data. Accounts are stored in the CampusConnect database; passwords are hashed.
      </p>
    </div>
  );
}

// /login: pick which login page to use
export function Login() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <Shell>
      <div className="w-full max-w-3xl">
        <h1 className="font-bold text-2xl text-center mb-2" style={{ color: '#1F1D2B' }}>Log in to CampusConnect</h1>
        <p className="text-sm text-center mb-8" style={{ color: '#454242' }}>
          Each role has its own login and its own dashboard. New here? <Link to="/signup" className="font-semibold" style={{ color: '#4637D2' }}>Create an account</Link>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(ROLE_INFO) as Role[]).map(role => (
            <Link key={role} to={`/login/${ROLE_SLUGS[role]}${q}`} data-role={role}
              className="bg-white rounded-2xl p-6 border border-border flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              style={{ boxShadow: '0 4px 24px rgba(31,29,43,0.06)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: role === 'student' ? '#4637D2' : '#1C1750' }} aria-hidden="true">{ROLE_INFO[role].icon}</div>
              <p className="font-bold text-base" style={{ color: '#1F1D2B' }}>{ROLE_LABELS[role]} login</p>
              <p className="text-sm" style={{ color: '#454242' }}>{ROLE_INFO[role].blurb}</p>
              <span className="text-sm font-semibold mt-auto" style={{ color: '#4637D2' }}>Continue →</span>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// /login/student, /login/club-manager, /login/faculty
export function RoleLogin() {
  const { role: slug } = useParams();
  const role = slug ? slugToRole[slug] : undefined;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWith, clubs } = useAppData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!role) return <Navigate to="/login" replace />;
  const info = ROLE_INFO[role];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await loginWith(email, password, role); // checked by the server against the hashed password
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    const next = params.get('next');
    navigate(next && next.startsWith('/') && !next.startsWith('/login') ? next : ROLE_HOME[role], { replace: true });
  };

  const fillDemo = () => { setEmail(info.demo.email); setPassword(info.demo.password); setError(''); };

  return (
    <Shell>
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 border border-border" style={{ boxShadow: '0 4px 24px rgba(31,29,43,0.08)' }}>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-6" style={{ color: '#4637D2' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          All logins
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: role === 'student' ? '#4637D2' : '#1C1750' }} aria-hidden="true">{info.icon}</span>
          <h1 className="font-bold text-2xl" style={{ color: '#1F1D2B' }}>{ROLE_LABELS[role]} login</h1>
        </div>
        <ul className="text-xs mb-6 mt-3 flex flex-col gap-1" style={{ color: '#454242' }}>
          {info.can.map(c => <li key={c}>✓ {c}</li>)}
        </ul>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold" style={{ color: '#1F1D2B' }}>Email</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border outline-none text-sm focus:border-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold" style={{ color: '#1F1D2B' }}>Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border outline-none text-sm focus:border-primary" />
          </div>
          {error && <p role="alert" className="text-sm font-medium px-4 py-3 rounded-xl" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>{error}</p>}
          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-primary hover:bg-primary-dark disabled:opacity-60">
            {busy ? 'Logging in…' : `Log in as ${ROLE_LABELS[role]}`}
          </button>
        </form>

        <p className="text-sm text-center mt-5" style={{ color: '#454242' }}>
          No account yet? <Link to={`/signup?role=${role}`} className="font-semibold" style={{ color: '#4637D2' }} data-testid="signup-link">Sign up</Link>
        </p>

        <div className="mt-6 p-4 rounded-xl text-xs" style={{ backgroundColor: '#EEECFB', color: '#2B2093' }}>
          <p className="font-semibold mb-1">Demo account</p>
          <p>{info.demo.email} · <code>{info.demo.password}</code></p>
          {info.demo.note && <p className="mt-1 opacity-80">{info.demo.note}</p>}
          {role === 'clubManager' && <p className="mt-1 opacity-80">Each manager only sees their own club ({clubs.length} clubs).</p>}
          <button type="button" onClick={fillDemo} className="mt-2 font-semibold underline">Fill in demo account</button>
        </div>
      </div>
    </Shell>
  );
}
