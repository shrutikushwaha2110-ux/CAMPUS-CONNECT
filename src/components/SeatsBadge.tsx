import type { SeatStatus } from '../lib/seats';

const styles: Record<SeatStatus, { bg: string; text: string; label: (n: number) => string }> = {
  available: { bg: '#DCFCE7', text: '#166534', label: n => `${n} seats left` },
  'almost-full': { bg: '#FEF3C7', text: '#78350F', label: () => 'Almost full' },
  full: { bg: '#FEE2E2', text: '#991B1B', label: () => 'Full' },
  cancelled: { bg: '#E2E8F0', text: '#334155', label: () => 'Cancelled' },
};

export function SeatsBadge({ status, seatsLeft }: { status: SeatStatus; seatsLeft: number }) {
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label(seatsLeft)}
    </span>
  );
}
