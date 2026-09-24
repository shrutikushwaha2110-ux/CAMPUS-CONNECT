import { useAppData } from '../state/AppData';

export function useSession() {
  const { session, currentUser, logout } = useAppData();
  return { session, user: currentUser, logout };
}
