import { NextResponse } from 'next/server';
import { clientA, requireUser } from '@/lib/server-ext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lecture seule : sessions de lecture de l'appli bibliothèque (projet A) pour une année
export async function GET(req: Request) {
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Non connectée' }, { status: 401 });
  const a = clientA();
  const uid = process.env.A_BIBLIO_USER_ID;
  if (!a || !uid) return NextResponse.json({ error: 'Bibliothèque non configurée (A_BIBLIO_USER_ID…)' }, { status: 503 });

  const year = Number(new URL(req.url).searchParams.get('year'));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'année invalide' }, { status: 400 });
  }
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const sessions = await a
    .from('bibliotheque_reading_sessions')
    .select('date,pages,book_id,moment')
    .eq('user_id', uid)
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (sessions.error) return NextResponse.json({ error: sessions.error.message }, { status: 500 });

  const ids = [...new Set((sessions.data ?? []).map((s) => s.book_id).filter(Boolean))] as string[];
  const [books, finished] = await Promise.all([
    ids.length
      ? a.from('bibliotheque_books').select('id,title,author').in('id', ids)
      : Promise.resolve({ data: [] as { id: string; title: string; author: string }[], error: null }),
    a
      .from('bibliotheque_books')
      .select('title,author,pages,date_finished')
      .eq('user_id', uid)
      .gte('date_finished', from)
      .lte('date_finished', to)
      .order('date_finished'),
  ]);

  return NextResponse.json({
    year,
    sessions: sessions.data ?? [],
    books: Object.fromEntries((books.data ?? []).map((b) => [b.id, { title: b.title, author: b.author }])),
    finished: finished.data ?? [],
  });
}
