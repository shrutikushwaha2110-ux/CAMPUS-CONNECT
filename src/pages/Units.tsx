import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMemberships } from '../hooks/useMemberships';
import { useClubs } from '../hooks/useClubs';
import { useSession } from '../hooks/useSession';
import unitsData from '../data/units.json';

export function Units() {
  const { hasFollowed, followUnit, unfollowUnit } = useMemberships();
  const { clubs } = useClubs();
  const [toast, setToast] = useState('');
  const { session } = useSession();
  const navigate = useNavigate();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleFollow = (id: string, name: string) => {
    // F16: following is a student feature; visitors are sent to the student login first
    if (!session) { navigate(`/login/student?next=${encodeURIComponent('/units')}`); return; }
    followUnit(id);
    showToast(`You're following ${name}`);
  };

  const handleUnfollow = (id: string, name: string) => {
    unfollowUnit(id);
    showToast(`Unfollowed ${name}`);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <h1 className="font-bold mb-10" style={{ fontSize: 'clamp(28px,4vw,40px)', color: '#1F1D2B' }}>Units</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {unitsData.map(unit => {
          const following = hasFollowed(unit.id);
          const supervisedClubs = clubs.filter(c => c.unitId === unit.id);
          return (
            <div key={unit.id} className="bg-white rounded-2xl p-6 flex flex-col gap-4"
              style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(31,29,43,0.07), 0 4px 16px rgba(31,29,43,0.05)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                  style={{ backgroundColor: '#1C1750' }}>
                  {unit.name[0]}
                </div>
                {(!session || session.role === 'student') && <button
                  onClick={() => following ? handleUnfollow(unit.id, unit.name) : handleFollow(unit.id, unit.name)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                  style={following
                    ? { backgroundColor: '#fff', color: '#4637D2', border: '1.5px solid #4637D2' }
                    : { backgroundColor: '#4637D2', color: '#fff', border: '1.5px solid #4637D2' }}
                  onMouseEnter={e => { if (!following) e.currentTarget.style.backgroundColor = '#372AAE'; }}
                  onMouseLeave={e => { if (!following) e.currentTarget.style.backgroundColor = '#4637D2'; }}>
                  {following && <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                  {following ? 'Following' : 'Follow'}
                </button>}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base" style={{ color: '#1F1D2B' }}>{unit.name}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#454242' }}>{unit.description}</p>
              </div>
              <div className="flex flex-col gap-2 mt-auto pt-3 border-t text-xs" style={{ borderColor: '#E2E8F0', color: '#454242' }}>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  <span><span style={{ color: '#64748b' }}>Head · </span>{unit.facultyName}</span>
                </div>
                {supervisedClubs.length > 0 ? (
                  <div className="flex items-start gap-1.5">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="mt-0.5 flex-shrink-0">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                    <span><span style={{ color: '#64748b' }}>Clubs · </span>{supervisedClubs.map(c => c.name).join(', ')}</span>
                  </div>
                ) : (
                  <span style={{ color: '#64748b' }}>No clubs yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <div role="status" className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold z-50 shadow-xl"
          style={{ backgroundColor: '#1C1750', color: '#fff' }}>
          <svg width="15" height="15" fill="none" stroke="#4ADE80" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
          {toast}
        </div>
      )}
    </div>
  );
}
