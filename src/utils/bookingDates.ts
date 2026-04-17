const DAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export type BookingDayOption = {
  id: string;
  day: string;
  date: string;
  label: string;
  iso: string;
};

export function getNextBookingDays(count: number): BookingDayOption[] {
  const out: BookingDayOption[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      id: iso,
      day: DAY[d.getDay()],
      date: String(d.getDate()),
      label: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      iso,
    });
  }
  return out;
}

export function monthYearLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
