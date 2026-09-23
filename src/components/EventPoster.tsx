import React from 'react';

export function EventPoster({
  category,
  className = '',
  style,
}: {
  category: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden flex items-end ${className}`}
      style={{ backgroundColor: '#1C1750', ...style }}
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ backgroundColor: '#4637D2', opacity: 0.35 }} />
      <div className="absolute bottom-4 left-6 w-16 h-16 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <span className="relative z-10 m-4 text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {category}
      </span>
    </div>
  );
}
