import { getSupabase } from './supabase';

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

function urlBase64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribePush(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error('Clé NEXT_PUBLIC_VAPID_PUBLIC_KEY manquante');
  if (!pushSupported()) throw new Error("Les notifications ne sont pas disponibles sur cet appareil / navigateur");
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Autorisation refusée : active les notifications dans les réglages du téléphone');
  const reg = await withTimeout(navigator.serviceWorker.ready, 5000);
  if (!reg) throw new Error("Service worker indisponible (les notifications ne marchent que sur la version déployée)");
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));
  const j = sub.toJSON();
  const { error } = await getSupabase()
    .from('bullet_push_subs')
    .upsert({ endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getSubscription();
  if (!sub) return;
  await getSupabase().from('bullet_push_subs').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
