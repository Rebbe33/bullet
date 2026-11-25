import { NextResponse } from 'next/server';
import { clientA, requireUser } from '@/lib/server-ext';
import { loadGites } from '@/lib/gites-server';
import { parisDate, plantsDue, type PlantTask } from '@/lib/ext-logic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lecture seule du projet A : réservations + ménages (gîtes) et soins du jour (plantes)
export async function GET(req: Request) {
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Non connectée' }, { status: 401 });
  const a = clientA();
  if (!a) return NextResponse.json({ error: 'Projet A non configuré (variables A_SUPABASE_…)' }, { status: 503 });

  const today = parisDate(new Date());
  const out: {
    today: string;
    gites: unknown[];
    plantes: ReturnType<typeof plantsDue> | null;
    maison: { total: number; restantes: number } | null;
    errors: string[];
  } = { today, gites: [], plantes: null, maison: null, errors: [] };

  // ----- Gîtes -----
  try {
    out.gites = await loadGites(a, today);
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

  // ----- Ménage maison : tâches prévues aujourd'hui (comme l'écran « Aujourd'hui » de l'appli) -----
  try {
    const { data, error } = await a.from('menage_planning').select('id,date_faite').eq('date_prevue', today);
    if (error) throw error;
    const rows = (data ?? []) as { id: string; date_faite: string | null }[];
    out.maison = { total: rows.length, restantes: rows.filter((r) => !r.date_faite).length };
  } catch (e) {
    out.errors.push('ménage : ' + (e instanceof Error ? e.message : String(e)));
  }

  return NextResponse.json(out);
}
