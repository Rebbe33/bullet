'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthGate';
import { getSupabase } from '@/lib/supabase';
import { getSubscription, pushSupported, subscribePush, unsubscribePush } from '@/lib/push';

export default function ReglagesPage() {
  const { user, signOut } = useAuth();
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSupported(pushSupported());
    void getSubscription().then((s) => setOn(!!s));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = () =>
    run(async () => {
      if (on) {
        await unsubscribePush();
        setOn(false);
      } else {
        await subscribePush();
        setOn(true);
        setMsg('Rappels activés sur cet appareil ✓');
      }
    });

  const test = () =>
    run(async () => {
      const { data } = await getSupabase().auth.getSession();
      const res = await fetch('/api/push-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      });
      const j = (await res.json()) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? 'Échec du test');
      setMsg(j.sent ? 'Notification envoyée, regarde ton écran 👀' : "Aucun appareil enregistré : active d'abord les rappels");
    });

  return (
    <>
      <div className="page-head">
        <h1>Réglages</h1>
      </div>

      <section className="card-block">
        <h2>Compte</h2>
        <p className="muted">Connectée en tant que {user?.email}</p>
        <button onClick={() => void signOut()}>Se déconnecter</button>
      </section>

      <section className="card-block">
        <h2>Rappels</h2>
        <p className="muted">
          Une notification 30 minutes avant chaque rendez-vous, et chaque matin (à partir de 8h) un
          résumé de ta journée avec les anniversaires du jour et du lendemain.
        </p>
        {!supported ? (
          <p className="muted">
            Les notifications ne sont pas disponibles ici. Sur iPhone, installe d'abord l'appli sur
            l'écran d'accueil (Partager › Sur l'écran d'accueil), puis ouvre-la depuis l'icône.
          </p>
        ) : (
          <div className="row-actions">
            <button className="primary" onClick={() => void toggle()} disabled={busy}>
              {on ? 'Désactiver sur cet appareil' : 'Activer sur cet appareil'}
            </button>
            {on && (
              <button onClick={() => void test()} disabled={busy}>
                Envoyer un test
              </button>
            )}
          </div>
        )}
        {msg && <p className="muted">{msg}</p>}
      </section>
    </>
  );
}
