// /manage: the Club Manager's dashboard, scoped to the club in their session
import { useSession } from '../../hooks/useSession';
import { ClubAdminView } from './ClubAdminView';

export function ManageHome() {
  const { session } = useSession();
  return <ClubAdminView clubId={session?.clubId ?? ''} eyebrow="Club Manager dashboard" />;
}
