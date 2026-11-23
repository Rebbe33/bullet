// Logique pure des liens avec les autres applis (projet A) : testable sans serveur.

export const TZ = 'Europe/Paris';

/** Date YYYY-MM-DD (heure de Paris) d'un horodatage */
export function parisDate(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDaysISO = (s: string, n: number) => fmt(new Date(parse(s).getTime() + n * 86400000));
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

// ---------- Gîtes ----------

export interface Reservation {
  id: string;
  gite_id: string | null;
  nom_locataire: string;
  date_arrivee: string;
  date_depart: string;
  nb_personnes: number | null;
  statut: string | null;
  notes: string | null;
}

/**
 * Ménage validé = dans l'appli gîtes, un passage (ou une session d'heures) du même gîte
 * enregistré à partir du jour du départ, et au plus tard le jour de l'arrivée suivante.
 */
export function menageDone(
  r: Reservation,
  all: Reservation[],
  doneDates: Map<string, string[]> // gite_id -> dates (YYYY-MM-DD) des ménages enregistrés
): boolean {
  const next = all
    .filter((x) => x.gite_id === r.gite_id && x.id !== r.id && x.date_arrivee >= r.date_depart)
    .map((x) => x.date_arrivee)
    .sort()[0];
  return (doneDates.get(r.gite_id ?? '') ?? []).some((d) => d >= r.date_depart && (!next || d <= next));
}

export const isCancelled = (r: Pick<Reservation, 'statut'>) => /annul/i.test(r.statut ?? '');

// ---------- Plantes (même règles que l'appli plantes) ----------

export const CARE_LABELS: Record<string, { label: string; emoji: string }> = {
  arrosage: { label: 'Arrosage', emoji: '💧' },
  brumisation: { label: 'Brumisation', emoji: '🌫️' },
  nettoyage: { label: 'Nettoyage des feuilles', emoji: '🧽' },
  engrais: { label: 'Engrais', emoji: '🌱' },
  rempotage: { label: 'Rempotage', emoji: '🪴' },
  bilan: { label: 'Bilan santé', emoji: '🩺' },
};

/** Hiver = novembre à mars */
export const isWinterISO = (iso: string) => {
  const m = Number(iso.slice(5, 7));
  return m >= 11 || m <= 3;
};

export interface PlantTask {
  plant_id: string;
  care_type: string;
  freq_summer: number;
  freq_winter: number | null;
  last_done: string | null;
}

/** Fréquence effective, ou null si le soin est en pause */
export function effectiveFreq(t: Pick<PlantTask, 'freq_summer' | 'freq_winter'>, today: string): number | null {
  const f = isWinterISO(today) && t.freq_winter !== null ? t.freq_winter : t.freq_summer;
  return f > 0 ? f : null;
}

/** Soins à faire aujourd'hui (ou en retard), regroupés par type de soin */
export function plantsDue(
  tasks: PlantTask[],
  plantNames: Map<string, string>, // seulement les plantes non archivées
  today: string
): { count: number; groups: { code: string; label: string; emoji: string; plants: string[] }[] } {
  const groups = new Map<string, string[]>();
  let count = 0;
  for (const t of tasks) {
    const name = plantNames.get(t.plant_id);
    if (!name) continue;
    const f = effectiveFreq(t, today);
    if (f === null) continue;
    const due = t.last_done ? addDaysISO(t.last_done, f) : today;
    if (due > today) continue;
    count++;
    groups.set(t.care_type, [...(groups.get(t.care_type) ?? []), name]);
  }
  return {
    count,
    groups: [...groups.entries()].map(([code, plants]) => ({
      code,
      label: CARE_LABELS[code]?.label ?? code,
      emoji: CARE_LABELS[code]?.emoji ?? '🌿',
      plants: plants.sort((a, b) => a.localeCompare(b, 'fr')),
    })),
  };
}

// ---------- Lecture ----------

/** Niveau d'intensité (0 = rien) selon les pages lues dans la journée */
export const readingLevel = (pages: number) => (pages <= 0 ? 0 : pages < 15 ? 1 : pages < 30 ? 2 : pages < 60 ? 3 : 4);
