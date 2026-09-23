import { Link } from 'react-router';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="relative mb-8">
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: '#4637D2', transform: 'scale(1.5)' }}
        />
        <span
          className="relative font-bold"
          style={{ fontSize: 'clamp(96px,18vw,160px)', color: '#4637D2', lineHeight: 1 }}
        >
          404
        </span>
      </div>
      <h1 className="font-bold mb-3" style={{ fontSize: 'clamp(24px,4vw,40px)', color: '#1F1D2B' }}>
        We couldn't find that page
      </h1>
      <p className="text-base mb-8" style={{ color: '#454242' }}>
        The page may have moved, or the link may be wrong.
      </p>
      <Link
        to="/events"
        className="px-6 py-3.5 rounded-xl font-semibold text-sm text-white transition-colors"
        style={{ backgroundColor: '#4637D2' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#372AAE')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4637D2')}
      >
        Back to events
      </Link>
    </div>
  );
}
