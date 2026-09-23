import type { AppClub } from '../data/types';

export function ClubTile({ club }: { club: AppClub }) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white"
      style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(31,29,43,0.07), 0 4px 16px rgba(31,29,43,0.05)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
        style={{ backgroundColor: '#1C1750' }}>
        {club.name[0]}
      </div>
      <div>
        <p className="font-semibold text-sm" style={{ color: '#1F1D2B' }}>{club.name}</p>
        <p className="text-xs mt-0.5" style={{ color: '#454242' }}>{club.memberCount} members</p>
      </div>
      <span className="inline-flex self-start px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#EEECFB', color: '#2B2093' }}>
        {club.category}
      </span>
    </div>
  );
}
