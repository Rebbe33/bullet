import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';
import { addDays } from '@/lib/dates';
import { birthdaysOn } from '@/lib/birthdays';
import { apptBody, buildDigest, dueApptReminders, parisNow, type Appt } from '@/lib/reminders';
import { clientA } from '@/lib/server-ext';
import { loadGites, type GiteEntry } from '@/lib/gites-server';
import type { Birthday } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Sub {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  // Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> » ; pg_cron aussi (voir migration 3)
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!url || !service || !pub || !priv) {
    return NextResponse.json({ error: 'variables manquantes' }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@example.com', pub, priv);
  const sb = createClient(url, service, { auth: { persistSession: false } });

  const { data: subsData, error: subsErr } = await sb.from('bullet_push_subs').select('*');
  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });
  const subs = (subsData ?? []) as Sub[];
  const now = parisNow();
  const tomorrow = addDays(now.date, 1);
  let sent = 0;

  const push = async (s: Sub, payload: object) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from('bullet_push_subs').delete().eq('id', s.id);
    }
  };

  // true si c'est la première fois (la clé est réservée)
  const claim = async (key: string) => {
    const { error } = await sb.from('bullet_reminders_sent').insert({ key });
    return !error;
  };

  const byUser = new Map<string, Sub[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);

  // projet A (gîtes) : chargé une seule fois, et seulement le soir
  let tomorrowGites: GiteEntry[] | null = null;
  const gitesDemain = async () => {
    if (tomorrowGites) return tomorrowGites;
    try {
      const a = clientA();
      tomorrowGites = a ? (await loadGites(a, now.date)).filter((g) => g.depart === tomorrow && !g.menageDone) : [];
    } catch {
      tomorrowGites = [];
    }
    return tomorrowGites;
  };

  for (const [uid, userSubs] of byUser) {
    // 1) rendez-vous du jour avec une heure
    const { data: appData } = await sb
      .from('bullet_items')
      .select('id,title,sched_date,start_time,location')
      .eq('user_id', uid)
      .eq('sched_type', 'day')
      .eq('sched_date', now.date)
      .eq('done', false)
      .not('start_time', 'is', null);
    for (const a of dueApptReminders((appData ?? []) as Appt[], now)) {
      if (!(await claim(`appt:${a.id}:${a.sched_date}:${a.start_time}`))) continue;
      for (const s of userSubs)
        await push(s, { title: a.title, body: apptBody(a, now), tag: `appt-${a.id}`, url: '/agenda' });
    }

    // 2) résumé du matin (entre 8h et 12h, une seule fois par jour)
    if (now.minutes >= 8 * 60 && now.minutes < 12 * 60 && (await claim(`digest:${uid}:${now.date}`))) {
      const [{ data: dayItems }, { data: bd }] = await Promise.all([
        sb
          .from('bullet_items')
          .select('id,title,start_time,location,is_appointment')
          .eq('user_id', uid)
          .eq('sched_type', 'day')
          .eq('sched_date', now.date)
          .eq('done', false),
        sb.from('bullet_birthdays').select('*').eq('user_id', uid),
      ]);
      const day = (dayItems ?? []) as { title: string; start_time: string | null; location: string | null; is_appointment: boolean }[];
      const list = (bd ?? []) as Birthday[];
      const digest = buildDigest({
        appts: day.filter((d) => d.is_appointment || d.start_time),
        taskCount: day.filter((d) => !d.is_appointment && !d.start_time).length,
        birthdaysToday: birthdaysOn(list, now.date).map((b) => b.name),
        birthdaysTomorrow: birthdaysOn(list, tomorrow).map((b) => b.name),
      });
      if (digest) for (const s of userSubs) await push(s, { ...digest, tag: 'digest', url: '/agenda' });
    }

    // 3) la veille d'un ménage (entre 18h et 22h) : matériel à emporter
    if (now.minutes >= 18 * 60 && now.minutes < 22 * 60) {
      const gs = await gitesDemain();
      if (gs.length > 0 && (await claim(`menage-eve:${uid}:${tomorrow}`))) {
        const lines = gs.map((g) => {
          const pers = g.suivante ? ` · 👥 ${g.suivante.personnes ?? '?'} pers. ensuite` : '';
          const mat = g.enCours ? 'ménage déjà commencé' : g.materiel.length ? `🧳 ${g.materiel.join(', ')}` : 'pas de matériel particulier';
          return `${g.gite} : ${mat}${pers}`;
        });
        for (const s of userSubs)
          await push(s, { title: '🧹 Ménage demain', body: lines.join('\n'), tag: 'menage-eve', url: '/agenda' });
      }
    }
  }

  // ménage : on oublie les rappels vieux de plus de 3 jours
  await sb
    .from('bullet_reminders_sent')
    .delete()
    .lt('sent_at', new Date(Date.now() - 3 * 86400000).toISOString());

  return NextResponse.json({ ok: true, devices: subs.length, sent });
}
