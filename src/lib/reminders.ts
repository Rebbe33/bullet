// Logique pure des rappels (testable sans serveur)

export const TZ = 'Europe/Paris';

/** Date (YYYY-MM-DD) et minutes depuis minuit, à l'heure de Paris */
export function parisNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const g = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minutes: Number(g('hour')) * 60 + Number(g('minute')) };
}

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':');
  return Number(h) * 60 + Number(m);
};

export interface Appt {
  id: string;
  title: string;
  sched_date: string;
  start_time: string;
  location?: string | null;
}

export const REMINDER_BEFORE = 30; // minutes
const GRACE = 10; // on rattrape un rappel jusqu'à 10 min après l'heure (cron en retard)

/** Rendez-vous à rappeler maintenant : de 30 min avant jusqu'à 10 min après l'heure */
export function dueApptReminders(appts: Appt[], now: { date: string; minutes: number }): Appt[] {
  return appts.filter((a) => {
    if (a.sched_date !== now.date) return false;
    const diff = timeToMinutes(a.start_time) - now.minutes;
    return diff <= REMINDER_BEFORE && diff >= -GRACE;
  });
}

export const hhmm = (t: string) => t.slice(0, 5);

export function apptBody(a: Appt, now: { minutes: number }): string {
  const diff = timeToMinutes(a.start_time) - now.minutes;
  const where = a.location ? ` · 📍 ${a.location}` : '';
  if (diff <= 0) return `${hhmm(a.start_time)} · c'est maintenant${where}`;
  return `${hhmm(a.start_time)} · dans ${diff} min${where}`;
}

/** Résumé du matin : null s'il n'y a rien à dire */
export function buildDigest(input: {
  appts: { title: string; start_time: string | null; location?: string | null }[];
  taskCount: number;
  birthdaysToday: string[];
  birthdaysTomorrow: string[];
}): { title: string; body: string } | null {
  const { appts, taskCount, birthdaysToday, birthdaysTomorrow } = input;
  const lines: string[] = [];
  if (birthdaysToday.length) lines.push(`🎂 Aujourd'hui : ${birthdaysToday.join(', ')}`);
  if (appts.length) {
    const sorted = [...appts].sort((a, b) => (a.start_time ?? '99').localeCompare(b.start_time ?? '99'));
    lines.push(
      'RDV : ' + sorted.map((a) => ((a.start_time ? `${hhmm(a.start_time)} ${a.title}` : a.title) + (a.location ? ` (${a.location})` : ''))).join(' · ')
    );
  }
  if (taskCount > 0) lines.push(`${taskCount} tâche${taskCount > 1 ? 's' : ''} aujourd'hui`);
  if (birthdaysTomorrow.length) lines.push(`🎂 Demain : ${birthdaysTomorrow.join(', ')}`);
  if (!lines.length) return null;
  return { title: 'Ta journée', body: lines.join('\n') };
}
