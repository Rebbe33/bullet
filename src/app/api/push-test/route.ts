import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Envoie une notification de test à tous les appareils de la personne connectée
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!token || !url || !anon || !pub || !priv) {
    return NextResponse.json({ error: 'Configuration incomplète (variables VAPID ?)' }, { status: 400 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@example.com', pub, priv);

  // on agit avec les droits de la personne connectée : elle ne voit que ses propres appareils
  const sb = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u.user) return NextResponse.json({ error: 'Non connectée' }, { status: 401 });
  const { data: subs, error } = await sb.from('bullet_push_subs').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'Bullet', body: 'Les rappels fonctionnent ✓', tag: 'test', url: '/agenda' })
      );
      sent++;
    } catch {
      /* appareil expiré : sera nettoyé par le prochain envoi */
    }
  }
  return NextResponse.json({ ok: true, sent });
}
