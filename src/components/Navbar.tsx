import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Logo } from './Logo';
import { useAppData } from '../state/AppData';
import { ROLE_LABELS } from '../lib/constants';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { session, currentUser, clubs, logout } = useAppData();
  const navigate = useNavigate();

  // Links depend on the role (each role has its own dashboard)
  const links = [
    { label: 'Events', to: '/events' },
    { label: 'Clubs', to: '/clubs' },
    { label: 'Units', to: '/units' },
    ...(session?.role === 'student' ? [{ label: 'My dashboard', to: '/dashboard' }] : []),
    ...(session?.role === 'clubManager' ? [{ label: 'Manage club', to: '/manage' }] : []),
    ...(session?.role === 'faculty'
      ? [{ label: 'Admin', to: '/faculty' }, { label: 'Users', to: '/faculty/users' }]
      : []),
  ];

  const isActive = (to: string) => pathname === to || (to !== '/faculty' && pathname.startsWith(to + '/'));

  const roleDetail = session?.role === 'clubManager'
    ? clubs.find(c => c.id === session.clubId)?.name
    : undefined;

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#E2E8F0', height: 72 }} aria-label="Main">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-full flex items-center justify-between gap-4">
        <Logo variant="light" />

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-7">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm font-medium transition-colors"
              aria-current={isActive(l.to) ? 'page' : undefined}
              style={{ color: isActive(l.to) ? '#4637D2' : '#454242' }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {session && currentUser ? (
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" data-testid="role-pill"
                style={{ backgroundColor: '#EEECFB', color: '#2B2093' }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: '#4637D2', fontSize: 9 }} aria-hidden="true">
                  {ROLE_LABELS[session.role][0]}
                </span>
                <span>{currentUser.name} · {ROLE_LABELS[session.role]}{roleDetail ? ` · ${roleDetail}` : ''}</span>
              </div>
              <button onClick={handleLogout} className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors hover:border-primary hover:text-primary"
                style={{ borderColor: '#E2E8F0', color: '#454242' }}>
                Log out
              </button>
            </div>
          ) : (
            <Link to="/login" className="hidden lg:block text-sm font-semibold px-4 py-2 rounded-lg text-white transition-colors bg-primary hover:bg-primary-dark">
              Log in
            </Link>
          )}

          <button className="lg:hidden p-2 rounded-lg" style={{ color: '#454242' }}
            onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu" aria-expanded={mobileOpen}>
            {mobileOpen
              ? <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden absolute top-[72px] left-0 right-0 bg-white border-b shadow-lg z-40" style={{ borderColor: '#E2E8F0' }}>
          {session && currentUser && (
            <p className="px-6 py-3 text-xs font-medium border-b" style={{ color: '#2B2093', backgroundColor: '#EEECFB', borderColor: '#E2E8F0' }}>
              {currentUser.name} · {ROLE_LABELS[session.role]}{roleDetail ? ` · ${roleDetail}` : ''}
            </p>
          )}
          {links.map(l => (
            <Link key={l.to} to={l.to} className="block px-6 py-4 text-sm font-medium border-b"
              style={{ color: '#1F1D2B', borderColor: '#E2E8F0' }}
              onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          {session ? (
            <button onClick={handleLogout} className="block w-full text-left px-6 py-4 text-sm font-semibold" style={{ color: '#4637D2' }}>
              Log out / switch role
            </button>
          ) : (
            <Link to="/login" className="block px-6 py-4 text-sm font-semibold" style={{ color: '#4637D2' }}
              onClick={() => setMobileOpen(false)}>
              Log in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
