import { NextResponse } from 'next/server';
import { clientA, requireUser } from '@/lib/server-ext';
import {
  addDaysISO,
  isCancelled,
  menageDone,
  parisDate,
  plantsDue,
  type PlantTask,
  type Reservation,
} from '@/lib/ext-logic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lecture seule du projet A : réservations + ménages (gîtes) et soins du jour (plantes)
export async function GET(req: Request) {
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Non connectée' }, { status: 401 });
  const a = clientA();
  if (!a) return NextResponse.json({ error: 'Projet A non configuré (variables A_SUPABASE_…)' }, { status: 503 });

  const today = parisDate(new Date());
  const from = addDaysISO(today, -45);
  const out: {
    today: string;
    gites: unknown[];
    plantes: ReturnType<typeof plantsDue> | null;
    errors: string[];
  } = { today, gites: [], plantes: null, errors: [] };

  // ----- Gîtes -----
  try {
    const [res, gites, passages, sessions] = await Promise.all([
      a
        .from('gite_reservations')
        .select('id,gite_id,nom_locataire,date_arrivee,date_depart,nb_personnes,statut,notes')
        .gte('date_depart', from)
        .order('date_arrivee'),
      a.from('gite_gites').select('id,nom'),
      a.from('gite_passages').select('gite_id,date_passage').gte('date_passage', `${from}T00:00:00Z`),
      a.from('gite_heures_sessions').select('gite_id,date_session').gte('date_session', from),
    ]);
    for (const r of [res, gites, passages, sessions]) if (r.error) throw r.error;

    const names = new Map((gites.data ?? []).map((g: { id: string; nom: string }) => [g.id, g.nom]));
    const done = new Map<string, string[]>();
    const push = (gid: string | null, d: string) => {
      if (!gid) return;
      done.set(gid, [...(done.get(gid) ?? []), d]);
    };
    for (const p of passages.data ?? []) push(p.gite_id, parisDate(p.date_passage));
    for (const s of sessions.data ?? []) push(s.gite_id, s.date_session);

    const all = ((res.data ?? []) as Reservation[]).filter((r) => !isCancelled(r));
    out.gites = all.map((r) => ({
      id: r.id,
      gite: names.get(r.gite_id ?? '') ?? 'Gîte',
      locataire: r.nom_locataire,
      arrivee: r.date_arrivee,
      depart: r.date_depart,
      personnes: r.nb_personnes,
      notes: r.notes,
      statut: r.statut,
      menageDone: menageDone(r, all, done),
    }));
  } catch (e) {
    out.errors.push('gîtes : ' + (e instanceof Error ? e.message : String(e)));
  }

  // ----- Plantes -----
  try {
    const [tasks, plants] = await Promise.all([
      a.from('plantes_tasks').select('plant_id,care_type,freq_summer,freq_winter,last_done').eq('active', true),
      a.from('plantes_plants').select('id,name').eq('archived', false),
    ]);
    if (tasks.error) throw tasks.error;
    if (plants.error) throw plants.error;
    const names = new Map((plants.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));
    out.plantes = plantsDue((tasks.data ?? []) as PlantTask[], names, today);
  } catch (e) {
    out.errors.push('plantes : ' + (e instanceof Error ? e.message : String(e)));
  }

  return NextResponse.json(out);
}
