import type { SchedType } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

/** Lundi de la semaine contenant `iso` */
export const mondayOf = (iso: string) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toISO(d);
};

export const firstOfMonth = (iso: string) => {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
};

export const lastOfMonth = (iso: string) => {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

/** Premier jour du mois, `n` mois plus tard (n peut être négatif) */
export const addMonths = (iso: string, n: number) => {
  const d = parseISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

/** Numéro de semaine ISO (1–53, semaines du lundi au dimanche) */
export const isoWeek = (iso: string) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // jeudi de cette semaine
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
};

/** Dernier jour (inclus) de la période planifiée */
export const periodEnd = (type: SchedType, date: string) => {
  if (type === 'day') return date;
  if (type === 'week') return addDays(date, 6);
  return lastOfMonth(date);
};

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', opts).format(parseISO(iso));

export const dayShort = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric' });
export const dayLong = (iso: string) =>
  fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const monthLabel = (iso: string) => fmt(iso, { month: 'long', year: 'numeric' });

export const weekLabel = (monday: string) =>
  `${fmt(monday, { day: 'numeric', month: 'short' })} – ${fmt(addDays(monday, 6), {
    day: 'numeric',
    month: 'short',
  })}`;

export const schedLabel = (type: SchedType, date: string) => {
  if (type === 'day') return fmt(date, { weekday: 'short', day: 'numeric', month: 'short' });
  if (type === 'week') return `Sem. ${weekLabel(date)}`;
  return monthLabel(date);
};
