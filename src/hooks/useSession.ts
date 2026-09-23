import { useAppData } from '../state/AppData';

export function useSession() {
  const { session, currentUser, login, logout } = useAppData();
  return { session, user: currentUser, login, logout };
}
