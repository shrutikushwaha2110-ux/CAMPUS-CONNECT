import type { EventCategory } from '../lib/constants';

const styles: Record<string, { bg: string; text: string }> = {
  'Cultural & Social': { bg: '#EEECFB', text: '#2B2093' },
  'Sports & Gaming': { bg: '#EEECFB', text: '#2B2093' },
  'Hackathon & Showcase': { bg: '#EEECFB', text: '#2B2093' },
  Workshop: { bg: '#EEECFB', text: '#2B2093' },
  'Guest Talk': { bg: '#EEECFB', text: '#2B2093' },
  'Career & Internship': { bg: '#EEECFB', text: '#2B2093' },
};

export function CategoryBadge({ category }: { category: EventCategory | string }) {
  const s = styles[category] ?? { bg: '#EEECFB', text: '#2B2093' };
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {category}
    </span>
  );
}
