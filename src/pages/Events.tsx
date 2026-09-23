import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useEvents } from '../hooks/useEvents';
import { useClubs } from '../hooks/useClubs';
import { useRegistrations } from '../hooks/useRegistrations';
import unitsData from '../data/units.json';
import { EVENT_CATEGORIES } from '../lib/constants';
import { filterEvents, type DateFilter } from '../lib/eventFilter';
import type { AppEvent } from '../data/types';
import { SearchBar } from '../components/SearchBar';
import { FilterChip } from '../components/FilterChip';
import { EventCard } from '../components/EventCard';

export function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const activeSearch = searchParams.get('q') ?? '';
  const activeCategory = searchParams.get('cat') ?? 'All';
  const activeDate = (searchParams.get('date') as DateFilter) ?? 'any';
  const activeHost = searchParams.get('host') ?? '';

  const { events, localTaken, hostName: nameOfHost } = useEvents();
  const { clubs } = useClubs();
  const { myRegistration } = useRegistrations();

  const hostNameOf = (e: AppEvent) => nameOfHost(e);

  // Filters live in the URL so a filtered list survives refresh and can be shared
  const setParam = (key: string, value: string, empty: string) => {
    const p = new URLSearchParams(searchParams);
    if (value === empty) p.delete(key); else p.set(key, value);
    setSearchParams(p);
  };

  const filtered = useMemo(
    () => filterEvents(events, { query: activeSearch, category: activeCategory, date: activeDate, host: activeHost }, hostNameOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, clubs, activeSearch, activeCategory, activeDate, activeHost],
  );

  const handleSearch = () => setParam('q', search.trim(), '');

  const clearFilters = () => {
    setSearch('');
    setSearchParams({});
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12">
      <div className="mb-10">
        <h1 className="font-bold mb-6" style={{ fontSize: 'clamp(28px,4vw,40px)', color: '#1F1D2B' }}>Events</h1>
        <SearchBar value={search} onChange={setSearch} onSearch={handleSearch} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4 pb-6 border-b" style={{ borderColor: '#E2E8F0' }}>
        <FilterChip label="All" selected={activeCategory === 'All'} onClick={() => setParam('cat', 'All', 'All')} />
        {EVENT_CATEGORIES.map(c => (
          <FilterChip key={c} label={c} selected={activeCategory === c} onClick={() => setParam('cat', c, 'All')} />
        ))}
        <div className="md:ml-auto flex gap-2 flex-wrap">
          <select aria-label="Filter by date" value={activeDate} onChange={e => setParam('date', e.target.value, 'any')}
            className="text-sm px-3 rounded-xl border h-11 outline-none" style={{ borderColor: '#E2E8F0', color: '#454242', backgroundColor: '#fff' }}>
            <option value="any">Any date</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <select aria-label="Filter by host" value={activeHost} onChange={e => setParam('host', e.target.value, '')}
            className="text-sm px-3 rounded-xl border h-11 outline-none max-w-full" style={{ borderColor: '#E2E8F0', color: '#454242', backgroundColor: '#fff' }}>
            <option value="">All hosts</option>
            <optgroup label="Clubs">
              {clubs.map(c => <option key={c.id} value={`club:${c.id}`}>{c.name}</option>)}
            </optgroup>
            <optgroup label="Units">
              {unitsData.map(u => <option key={u.id} value={`unit:${u.id}`}>{u.name}</option>)}
            </optgroup>
          </select>
        </div>
      </div>

      <p className="text-sm font-medium mb-8" style={{ color: '#454242' }}>{filtered.length} events</p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EEECFB' }}>
            <svg width="24" height="24" fill="none" stroke="#4637D2" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </div>
          <h2 className="font-bold text-xl" style={{ color: '#1F1D2B' }}>No events match your search</h2>
          <p className="text-sm" style={{ color: '#454242' }}>Try a different word or clear your filters.</p>
          <button onClick={clearFilters} className="mt-2 px-6 py-3 rounded-xl font-semibold text-sm text-white" style={{ backgroundColor: '#4637D2' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#372AAE')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4637D2')}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(e => <EventCard key={e.id} event={e} localTaken={localTaken(e.id)} hostName={nameOfHost(e)} myStatus={myRegistration(e.id)?.status} />)}
        </div>
      )}
    </div>
  );
}
