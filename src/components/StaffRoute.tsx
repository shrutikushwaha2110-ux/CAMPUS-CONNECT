// Public pages that staff don't use are replaced for them (SPEC §2):
// Club Managers only have "Manage club" + "Events"; Faculty have no Units page.
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from '../hooks/useSession';
import { ROLE_HOME, type Role } from '../lib/constants';

// Sends the listed roles to their own home instead of rendering the page
export function HideFor({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session } = useSession();
  if (session && roles.includes(session.role)) return <Navigate to={ROLE_HOME[session.role]} replace />;
  return <>{children}</>;
}

// Renders `staff` for Club Managers / Faculty and `others` for students and visitors
export function ByRole({ staff, others }: { staff: ReactNode; others: ReactNode }) {
  const { session } = useSession();
  return <>{session && session.role !== 'student' ? staff : others}</>;
}
