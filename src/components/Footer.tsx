import { Link } from 'react-router';
import { Logo } from './Logo';
import { useSession } from '../hooks/useSession';

export function Footer() {
  const { session } = useSession();
  // Same sections as the navbar for each role (Club Managers: no Clubs/Units; Faculty: no Units)
  const links =
    session?.role === 'clubManager' ? [
      { label: 'Manage club', to: '/manage' },
      { label: 'Events', to: '/events' },
    ] : session?.role === 'faculty' ? [
      { label: 'Admin', to: '/faculty' },
      { label: 'Events', to: '/events' },
      { label: 'Clubs', to: '/clubs' },
    ] : [
      { label: 'Events', to: '/events' },
      { label: 'Clubs', to: '/clubs' },
      { label: 'Units', to: '/units' },
      { label: session ? 'My dashboard' : 'Log in', to: session ? '/dashboard' : '/login' },
    ];

  return (
    <footer style={{ backgroundColor: '#1C1750' }} className="mt-24">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b" style={{ borderColor: 'rgba(203,213,225,0.15)' }}>
          <Logo variant="dark" />
          <div className="flex flex-wrap gap-6">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm font-medium transition-opacity hover:opacity-100 opacity-70"
                style={{ color: '#CBD5E1' }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-6 text-xs" style={{ color: '#CBD5E1', opacity: 0.7 }}>
          Unofficial student project. Clubs and events are sample data.
        </p>
      </div>
    </footer>
  );
}
