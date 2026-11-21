import type { Birthday, NewBirthday } from './types';
import { parseISO, toISO } from './dates';

export const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Nombre de jours max d'un mois (29 pour février, pour accepter le 29 février) */
export const maxDay = (month: number) => new Date(2024, month, 0).getDate();

/** Date réelle de l'anniversaire une année donnée (le 29 février devient le 28 les années non bissextiles) */
export function birthdayDateIn(b: Pick<Birthday, 'month' | 'day'>, year: number): string {
  const day = b.month === 2 && b.day === 29 && !isLeap(year) ? 28 : b.day;
  return toISO(new Date(year, b.month - 1, day));
}

export function birthdaysOn(list: Birthday[], iso: string): Birthday[] {
  const year = Number(iso.slice(0, 4));
  return list.filter((b) => birthdayDateIn(b, year) === iso);
}

export function nextBirthday(b: Pick<Birthday, 'month' | 'day'>, fromISO: string): string {
  const y = Number(fromISO.slice(0, 4));
  const thisYear = birthdayDateIn(b, y);
  return thisYear >= fromISO ? thisYear : birthdayDateIn(b, y + 1);
}

export const daysUntil = (fromISO: string, toISOStr: string) =>
  Math.round((parseISO(toISOStr).getTime() - parseISO(fromISO).getTime()) / 86400000);

/** Âge fêté à cette date (null si l'année de naissance est inconnue) */
export const ageOn = (b: Pick<Birthday, 'birth_year'>, iso: string) =>
  b.birth_year ? Number(iso.slice(0, 4)) - b.birth_year : null;

/**
 * Lit une liste du type :
 *   Maman 12/03/1960
 *   Julie, 03/07
 *   Paul - 25.12.85
 * (jour/mois, année facultative)
 */
export function parseBirthdays(text: string): { rows: NewBirthday[]; invalid: string[] } {
  const rows: NewBirthday[] = [];
  const invalid: string[] = [];
  const nowYY = new Date().getFullYear() % 100;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^([-*+•–]|\d+[.)])\s+/, '');
    if (!line) continue;
    const m = line.match(/^(.+?)[\s,;:\-–]+(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?\s*$/);
    if (!m) {
      invalid.push(raw.trim());
      continue;
    }
    const day = Number(m[2]);
    const month = Number(m[3]);
    let year: number | null = m[4] ? Number(m[4]) : null;
    if (year !== null && year < 100) year += year <= nowYY ? 2000 : 1900;
    if (month < 1 || month > 12 || day < 1 || day > maxDay(month)) {
      invalid.push(raw.trim());
      continue;
    }
    rows.push({ name: m[1].trim(), month, day, birth_year: year });
  }
  return { rows, invalid };
}
