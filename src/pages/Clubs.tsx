import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppData } from '../state/AppData';
import { useMemberships } from '../hooks/useMemberships';
import { SearchBar } from '../components/SearchBar';
import { CLUB_CATEGORIES, MAX_CLUBS_PER_STUDENT } from '../lib/constants';
import type { ClubCategory } from '../lib/constants';
import { FilterChip } from '../components/FilterChip';
import { StudentRules } from '../components/StudentRules';
import { ConfirmDialog, useToast } from '../components/ui';
import { memberCount, joinBlockReason } from '../lib/memberships';
import { upcomingSorted } from '../lib/eventFilter';
import { canViewClubAdmin } from '../lib/permissions';

export function Clubs() {
  const { clubs, units, events, memberships, session, liveClubIds } = useAppData();
  const { hasJoined, joinedClubs, joinClub, leaveClub } = useMemberships();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ClubCategory | 'All'>('All');
  const [leaving, setLeaving] = useState<{ id: string; name: string } | null>(null);

  const isStudent = session?.role === 'student';
  const atLimit = isStudent && joinedClubs.length >= MAX_CLUBS_PER_STUDENT;
  const upcoming = useMemo(() => upcomingSorted(events).filter(e => e.status === 'active'), [events]);

  const filtered = useMemo(() =>
    clubs.filter(c => {
      const matchesCat = activeCategory === 'All' || c.category === activeCategory;
      const q = activeSearch.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    }), [clubs, activeCategory, activeSearch]);

  const handleJoin = (id: string, name: string) => {
    const block = joinBlockReason({ role: session?.role ?? null, userId: session?.userId ?? null, clubId: id, memberships, liveClubIds });
    if (block === 'login') { navigate(`/login/student?next=${encodeURIComponent('/clubs')}`); return; }
    if (block === 'limit') { toast(`You can join a maximum of ${MAX_CLUBS_PER_STUDENT} clubs. Leave one first.`); return; }
    if (block) return;
    joinClub(id);
    toast(`You joined ${name}`);
  };

  const confirmLeave = () => {
    if (!leaving) return;
    leaveClub(leaving.id);
    toast(`You left ${leaving.name}`);
    setLeaving(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <div className="mb-8">
        <h1 className="font-bold mb-6" style={{ fontSize: 'clamp(28px,4vw,40px)', color: '#1F1D2B' }}>Clubs</h1>
        <SearchBar value={search} onChange={setSearch} onSearch={() => setActiveSearch(search)} placeholder="Search clubs or categories" />
      </div>

      <StudentRules joined={isStudent ? joinedClubs.length : undefined} />

      <div className="flex items-center gap-2.5 flex-wrap mb-6 mt-8">
        <FilterChip label="All" selected={activeCategory === 'All'} onClick={() => setActiveCategory('All')} />
        {CLUB_CATEGORIES.map(c => (
          <FilterChip key={c} label={c} selected={activeCategory === c} onClick={() => setActiveCategory(c)} />
        ))}
      </div>

      <p className="text-sm font-medium mb-6" style={{ color: '#454242' }}>{filtered.length} clubs</p>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16 rounded-2xl border border-dashed text-sm font-medium" style={{ borderColor: '#E2E8F0', color: '#64748b' }}>
          No clubs match your search.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(club => {
          const joined = hasJoined(club.id);
          const count = memberCount(club, memberships);
          const unitName = units.find(u => u.id === club.unitId)?.name ?? club.unitId;
          const clubEvents = upcoming.filter(e => e.hostType === 'club' && e.hostId === club.id);
          const joinDisabled = !joined && atLimit;
          return (
            <div key={club.id} data-club={club.id} className="bg-white rounded-2xl p-6 flex flex-col gap-4"
              style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(31,29,43,0.07), 0 4px 16px rgba(31,29,43,0.05)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                  style={{ backgroundColor: '#1C1750' }}>
                  {club.name[0]}
                </div>
                {session && session.role !== 'student' ? (
                  canViewClubAdmin(session, club.id) ? (
                    <Link to={session.role === 'faculty' ? `/faculty/clubs/${club.id}` : '/manage'}
                      className="px-4 py-2 rounded-xl text-sm font-semibold border-[1.5px] border-primary text-primary hover:bg-primary-tint">Manage</Link>
                  ) : null
                ) : (
                  <button
                    onClick={() => joined ? setLeaving({ id: club.id, name: club.name }) : handleJoin(club.id, club.name)}
                    disabled={joinDisabled}
                    title={joinDisabled ? `You can join a maximum of ${MAX_CLUBS_PER_STUDENT} clubs` : undefined}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed"
                    style={joined
                      ? { backgroundColor: '#fff', color: '#4637D2', border: '1.5px solid #4637D2' }
                      : joinDisabled
                        ? { backgroundColor: '#E2E8F0', color: '#64748b', border: '1.5px solid #E2E8F0' }
                        : { backgroundColor: '#4637D2', color: '#fff', border: '1.5px solid #4637D2' }}>
                    {joined && <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>}
                    {joined ? 'Joined' : joinDisabled ? 'Limit reached' : 'Join'}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-base" style={{ color: '#1F1D2B' }}>{club.name}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#454242' }}>{club.description}</p>
              </div>
              {clubEvents.length > 0 && (
                <div className="text-xs flex flex-col gap-1" style={{ color: '#454242' }}>
                  <span className="font-semibold" style={{ color: '#1F1D2B' }}>Upcoming events (open to everyone)</span>
                  {clubEvents.slice(0, 2).map(e => (
                    <Link key={e.id} to={`/events/${e.id}`} className="hover:underline" style={{ color: '#4637D2' }}>{e.title} →</Link>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap mt-auto pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#EEECFB', color: '#2B2093' }}>
                  {club.category}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: '#454242' }} data-members>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  {count} members
                </span>
                <span className="text-xs ml-auto" style={{ color: '#64748b' }}>Unit · {unitName}</span>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!leaving}
        title="Are you sure?"
        message={<>Leave <strong>{leaving?.name}</strong>? You can still register for its events.</>}
        confirmLabel="Leave club"
        onConfirm={confirmLeave}
        onCancel={() => setLeaving(null)}
      />
    </div>
  );
}
