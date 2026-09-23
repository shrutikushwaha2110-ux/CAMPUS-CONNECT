import { useCallback } from 'react';
import { useAppData } from '../state/AppData';

export function useClubs() {
  const { clubs, saveClub, deleteClub } = useAppData();
  const getClub = useCallback((id: string) => clubs.find(c => c.id === id), [clubs]);
  return { clubs, getClub, saveClub, deleteClub };
}
