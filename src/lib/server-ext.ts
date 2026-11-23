import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Vérifie que l'appel vient d'une personne connectée à Bullet (projet B) */
export async function requireUser(req: Request): Promise<boolean> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return false;
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return !error && !!data.user;
}

/** Client du projet A (gîtes, plantes, bibliothèque…), avec la clé secrète : uniquement côté serveur */
export function clientA(): SupabaseClient | null {
  const url = process.env.A_SUPABASE_URL;
  const key = process.env.A_SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
