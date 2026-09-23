interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSearch?: () => void;
  tall?: boolean;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onSearch, tall = false, placeholder = 'Search events, clubs or hosts' }: SearchBarProps) {
  return (
    <div
      className="flex items-center rounded-xl border bg-white overflow-hidden"
      style={{ borderColor: '#E2E8F0', height: tall ? 72 : 48 }}
    >
      <div className="pl-4 pr-2 flex items-center" style={{ color: '#454242' }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSearch?.()}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm px-2"
        style={{ color: '#1F1D2B', fontSize: tall ? 16 : 14 }}
      />
      <button
        onClick={onSearch}
        className="px-5 h-full font-semibold text-sm transition-colors"
        style={{ backgroundColor: '#4637D2', color: '#fff', minWidth: 88 }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#372AAE')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4637D2')}
      >
        Search
      </button>
    </div>
  );
}
