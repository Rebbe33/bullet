import type { Item, RepeatUnit, Sched, SchedType } from './types';
import { addDays, addMonthsKeepDay, firstOfMonth, mondayOf, periodEnd } from './dates';

export const REPEAT_PRESETS: { key: string; label: string; unit: RepeatUnit | null; every: number }[] = [
  { key: 'none', label: 'Ne se répète pas', unit: null, every: 1 },
  { key: 'day-1', label: 'Tous les jours', unit: 'day', every: 1 },
  { key: 'week-1', label: 'Toutes les semaines', unit: 'week', every: 1 },
  { key: 'week-2', label: 'Toutes les 2 semaines', unit: 'week', every: 2 },
  { key: 'month-1', label: 'Tous les mois', unit: 'month', every: 1 },
  { key: 'month-3', label: 'Tous les 3 mois', unit: 'month', every: 3 },
  { key: 'month-12', label: 'Tous les ans', unit: 'month', every: 12 },
];

export const presetKey = (unit: RepeatUnit | null, every: number) =>
  unit ? `${unit}-${every}` : 'none';

export function repeatLabel(unit: RepeatUnit | null, every: number): string {
  const p = REPEAT_PRESETS.find((x) => x.key === presetKey(unit, every));
  if (p) return p.label;
  if (!unit) return 'Ne se répète pas';
  const word = unit === 'day' ? 'jours' : unit === 'week' ? 'semaines' : 'mois';
  return `Tous les ${every} ${word}`;
}

/**
 * Prochaine occurrence d'un élément répétitif : on avance depuis sa date prévue
 * (pas depuis le jour où on le coche) jusqu'à tomber sur une période pas encore passée.
 */
export function nextOccurrence(
  item: Pick<Item, 'sched_type' | 'sched_date' | 'repeat_unit' | 'repeat_every'>,
  today: string
): Sched {
  const type: SchedType = item.sched_type ?? 'day';
  let unit: RepeatUnit = item.repeat_unit ?? 'day';
  const every = Math.max(1, item.repeat_every || 1);
  // un élément « de la semaine » avance par semaines, « du mois » par mois
  if (type === 'week' && unit === 'day') unit = 'week';
  if (type === 'month') unit = 'month';

  const step = (d: string) => {
    const x =
      unit === 'day' ? addDays(d, every) : unit === 'week' ? addDays(d, 7 * every) : addMonthsKeepDay(d, every);
    return type === 'week' ? mondayOf(x) : type === 'month' ? firstOfMonth(x) : x;
  };

  let date = step(item.sched_date ?? today);
  for (let i = 0; i < 2000 && periodEnd(type, date) < today; i++) date = step(date);
  return { type, date };
}
