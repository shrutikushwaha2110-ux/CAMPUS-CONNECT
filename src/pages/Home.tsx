import { useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router';
import { useEvents } from '../hooks/useEvents';
import { useClubs } from '../hooks/useClubs';
import { useRegistrations } from '../hooks/useRegistrations';
import unitsData from '../data/units.json';
import { SearchBar } from '../components/SearchBar';
import { FilterChip } from '../components/FilterChip';
import { EventCard } from '../components/EventCard';
import { EventPoster } from '../components/EventPoster';
import { SeatsBadge } from '../components/SeatsBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { seatsLeft, seatStatus } from '../lib/seats';
import { formatDate } from '../lib/date';
import { useAppData } from '../state/AppData';

// Three.js is ~600 KB; load it after the page so search and cards are usable first
const HeroScene = lazy(() => import('../components/3d/HeroScene').then(m => ({ default: m.HeroScene })));

export function Home() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { upcomingEvents, localTaken, hostName } = useEvents();
  const { clubs } = useClubs();
  const { myRegistration } = useRegistrations();
  const { clubMemberCount } = useAppData();

  const featuredEvent = upcomingEvents.find(e => e.id === 'annual-dance-fest') ?? upcomingEvents[0];
  const upcoming3 = upcomingEvents.filter(e => e.id !== featuredEvent?.id).slice(0, 3);

  const handleSearch = () => {
    navigate(search.trim() ? `/events?q=${encodeURIComponent(search)}` : '/events');
  };

  if (!featuredEvent) return null;

  const taken = localTaken(featuredEvent.id);
  const left = seatsLeft(featuredEvent.seatsTotal, featuredEvent.seatsTaken, taken);
  const status = seatStatus(featuredEvent.seatsTotal, featuredEvent.seatsTaken, taken, featuredEvent.status);

  return (
    <div>
      {/* Hero with 3D scene */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#1C1750', minHeight: 500 }}>
        {/* Three.js scene as background */}
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-6 pt-20 pb-32 flex flex-col items-center text-center gap-6">
          <div className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(70,55,210,0.4)', color: '#a5b4fc' }}>
            Atria University
          </div>
          <h1 className="font-bold text-white max-w-2xl" style={{ fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1.15 }}>
            Find what's happening at Atria
          </h1>
          <p className="max-w-lg" style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.6 }}>
            Discover workshops, hackathons, cultural nights and more, all on campus.
          </p>
          <div className="w-full max-w-2xl">
            <SearchBar value={search} onChange={setSearch} onSearch={handleSearch} tall />
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <FilterChip label="Workshop" selected onClick={() => navigate('/events?cat=Workshop')} />
            <FilterChip label="Hackathon & Showcase" onClick={() => navigate('/events?cat=Hackathon+%26+Showcase')} />
          </div>
        </div>
      </section>

      {/* Featured event */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 -mt-14 relative z-10 mb-20">
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row"
          style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(31,29,43,0.10)' }}>
          <EventPoster category={featuredEvent.category} className="h-56 md:h-auto md:w-5/12 flex-shrink-0" />
          <div className="p-8 flex flex-col gap-4 justify-center flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#1C1750', color: '#fff' }}>★ Featured</span>
              <CategoryBadge category={featuredEvent.category} />
            </div>
            <h2 className="font-bold" style={{ fontSize: 28, color: '#1F1D2B', lineHeight: 1.25 }}>{featuredEvent.title}</h2>
            <div className="flex flex-col gap-2 text-sm" style={{ color: '#454242' }}>
              <div className="flex items-center gap-2">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                {formatDate(featuredEvent.date)} · {featuredEvent.time}
              </div>
              <div className="flex items-center gap-2">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                {featuredEvent.venue}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SeatsBadge status={status} seatsLeft={left} />
              <Link to={`/events/${featuredEvent.id}`} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors"
                style={{ backgroundColor: '#4637D2' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#372AAE')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4637D2')}>
                View event →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-bold" style={{ fontSize: 24, color: '#1F1D2B' }}>Upcoming events</h2>
          <Link to="/events" className="text-sm font-semibold" style={{ color: '#4637D2' }}>See all →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {upcoming3.map(e => <EventCard key={e.id} event={e} localTaken={localTaken(e.id)} hostName={hostName(e)} myStatus={myRegistration(e.id)?.status} />)}
        </div>
      </section>

      {/* Popular clubs */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mb-20">
        <h2 className="font-bold mb-8" style={{ fontSize: 24, color: '#1F1D2B' }}>Popular clubs</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {clubs.map(c => (
            <Link key={c.id} to="/clubs" className="flex flex-col gap-3 p-5 rounded-2xl bg-white no-underline transition-all hover:-translate-y-0.5"
              style={{ border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(31,29,43,0.07), 0 4px 16px rgba(31,29,43,0.05)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ backgroundColor: '#1C1750' }}>
                {c.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1F1D2B' }}>{c.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#454242' }}>{clubMemberCount(c)} members</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Units strip */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 mb-6">
        <h2 className="font-bold mb-6" style={{ fontSize: 24, color: '#1F1D2B' }}>Explore units</h2>
        <div className="flex flex-wrap gap-3">
          {unitsData.map(u => (
            <Link key={u.id} to="/units" className="px-4 py-2 rounded-full text-sm font-medium border transition-colors"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#1F1D2B' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4637D2'; e.currentTarget.style.color = '#4637D2'; e.currentTarget.style.backgroundColor = '#EEECFB'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#1F1D2B'; e.currentTarget.style.backgroundColor = '#fff'; }}>
              {u.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
