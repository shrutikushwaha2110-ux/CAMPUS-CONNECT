// "Today" always comes from getToday() so tests can fix the date (SPEC §7)
export function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isPast(date: string): boolean {
  return date < getToday();
}

export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
