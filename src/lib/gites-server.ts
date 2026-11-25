import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addDaysISO,
  isCancelled,
  materielAEmporter,
  menageDone,
  nextPassage,
  parisDate,
  type MaterielTask,
  type PassageRow,
  type Reservation,
} from './ext-logic';

export interface GiteEntry {
  id: string;
  giteId: string | null;
  gite: string;
  locataire: string;
  arrivee: string;
  depart: string;
  personnes: number | null;
  notes: string | null;
  statut: string | null;
  menageDone: boolean;
  /** matériel à emporter (seulement pour le prochain ménage à faire de ce gîte) */
  materiel: string[];
  /** un ménage est déjà commencé dans l'appli gîtes */
  enCours: boolean;
  /** réservation suivante du même gîte (pour savoir pour combien de personnes préparer) */
  suivante: { arrivee: string; personnes: number | null; locataire: string } | null;
}

function suivante(r: Reservation, all: Reservation[]) {
  const n = all
    .filter((x) => x.gite_id === r.gite_id && x.id !== r.id && x.date_arrivee >= r.date_depart)
    .sort((x, y) => x.date_arrivee.localeCompare(y.date_arrivee))[0];
  return n ? { arrivee: n.date_arrivee, personnes: n.nb_personnes, locataire: n.nom_locataire } : null;
}

/** Lecture seule du projet A : réservations, ménages validés et matériel à emporter */
export async function loadGites(a: SupabaseClient, today: string): Promise<GiteEntry[]> {
  const from = addDaysISO(today, -45);
  const [res, gites, passages, sessions, tasks] = await Promise.all([
    a
      .from('gite_reservations')
      .select('id,gite_id,nom_locataire,date_arrivee,date_depart,nb_personnes,statut,notes')
      .gte('date_depart', from)
      .order('date_arrivee'),
    a.from('gite_gites').select('id,nom'),
    a.from('gite_passages').select('gite_id,numero,cloture,date_passage'),
    a.from('gite_heures_sessions').select('gite_id,date_session').gte('date_session', from),
    a.from('gite_tasks').select('gite_id,freq,last_done_passage,materiel'),
  ]);
  for (const r of [res, gites, passages, sessions]) if (r.error) throw r.error;

  const names = new Map((gites.data ?? []).map((g: { id: string; nom: string }) => [g.id, g.nom]));
  const allPassages = (passages.data ?? []) as PassageRow[];
  // si la colonne « materiel » n'existe pas encore, on continue sans
  const allTasks = (tasks.error ? [] : (tasks.data ?? [])) as MaterielTask[];

  const done = new Map<string, string[]>();
  const add = (gid: string | null, d: string) => {
    if (!gid) return;
    done.set(gid, [...(done.get(gid) ?? []), d]);
  };
  for (const p of allPassages) if (p.cloture && p.date_passage >= from) add(p.gite_id, parisDate(p.date_passage));
  for (const s of sessions.data ?? []) add(s.gite_id, s.date_session);

  const all = ((res.data ?? []) as Reservation[]).filter((r) => !isCancelled(r));
  const list: GiteEntry[] = all.map((r) => ({
    id: r.id,
    giteId: r.gite_id,
    gite: names.get(r.gite_id ?? '') ?? 'Gîte',
    locataire: r.nom_locataire,
    arrivee: r.date_arrivee,
    depart: r.date_depart,
    personnes: r.nb_personnes,
    notes: r.notes,
    statut: r.statut,
    menageDone: menageDone(r, all, done),
    materiel: [],
    enCours: false,
    suivante: suivante(r, all),
  }));

  // matériel : uniquement pour le prochain ménage non validé de chaque gîte
  const seen = new Set<string>();
  for (const e of [...list].sort((x, y) => x.depart.localeCompare(y.depart))) {
    if (e.menageDone || e.depart < addDaysISO(today, -3)) continue;
    const k = e.giteId ?? '';
    if (seen.has(k)) continue;
    seen.add(k);
    const { next, open } = nextPassage(allPassages, e.giteId);
    e.enCours = open;
    if (!open) e.materiel = materielAEmporter(allTasks, e.giteId, next);
  }
  return list;
}
