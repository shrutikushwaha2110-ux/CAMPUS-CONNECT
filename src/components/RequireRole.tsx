// Route guard (SPEC rule 17): access is checked from the session, not just hidden in the navbar,
// so typing a restricted URL never skips the check.
import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { ROLE_HOME, ROLE_LABELS, ROLE_SLUGS, type Role } from '../lib/constants';
import { Button, ButtonLink, Card } from './ui';

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    const target = roles.length === 1 ? `/login/${ROLE_SLUGS[roles[0]]}?next=${next}` : `/login?next=${next}`;
    return <Navigate to={target} replace />;
  }
  if (!roles.includes(session.role)) return <NotAllowed allowed={roles} />;
  return <>{children}</>;
}

export function NotAllowed({ allowed, message }: { allowed?: Role[]; message?: string }) {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const who = allowed?.map(r => ROLE_LABELS[r]).join(' or ');
  return (
    <div className="max-w-[640px] mx-auto px-4 md:px-6 py-16">
      <Card className="p-8 text-center flex flex-col items-center gap-4" data-testid="not-allowed">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary-tint">
          <svg width="24" height="24" fill="none" stroke="#4637D2" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 118 0v4" /></svg>
        </div>
        <h1 className="font-bold text-xl text-text">Not available for your role</h1>
        <p className="text-sm text-text-muted">
          {message ?? (who ? `This page is only for ${who}.` : 'You do not have access to this page.')}
          {session && <> You're signed in as <strong>{ROLE_LABELS[session.role]}</strong>.</>}
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {session && <ButtonLink to={ROLE_HOME[session.role]} variant="secondary">Go to my dashboard</ButtonLink>}
          <Button onClick={async () => { await logout(); navigate('/login'); }}>Switch role</Button>
        </div>
      </Card>
    </div>
  );
}
