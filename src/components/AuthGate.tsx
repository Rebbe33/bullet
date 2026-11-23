'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { StoreProvider } from '@/lib/store';

interface Auth {
  user: User;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const a = useContext(AuthCtx);
  if (!a) throw new Error('useAuth doit être utilisé dans <AuthGate>');
  return a;
}

const frError = (m: string) =>
  /invalid login credentials/i.test(m)
    ? 'E-mail ou mot de passe incorrect.'
    : /email not confirmed/i.test(m)
      ? "Cet e-mail n'est pas confirmé (voir Supabase → Authentication → Users)."
      : /failed to fetch|network/i.test(m)
        ? 'Pas de connexion réseau.'
        : m;

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setErr(frError(error.message));
    } catch (e2) {
      setErr(frError(e2 instanceof Error ? e2.message : String(e2)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit}>
        <h1>✎ Bullet</h1>
        <p className="muted small">Connecte-toi pour accéder à ton journal.</p>
        <input
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <p className="bf-err">{err}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  );
}

/** Affiche l'appli seulement si on est connecté ; sinon, le formulaire de connexion */
export function AuthGate({ children }: { children: ReactNode }) {
  // undefined = on vérifie encore · null = pas connecté
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sb = getSupabase();
      void sb.auth.getSession().then(({ data }) => setSession(data.session));
      const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
      return () => data.subscription.unsubscribe();
    } catch (e) {
      setFatal(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const signOut = async () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('bullet_cache_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    await getSupabase().auth.signOut();
  };

  if (fatal) return <p className="error">⚠️ {fatal}</p>;
  if (session === undefined) return <p className="muted wrap">Chargement…</p>;
  if (!session) return <LoginForm />;

  return (
    <AuthCtx.Provider value={{ user: session.user, signOut }}>
      <StoreProvider userId={session.user.id}>{children}</StoreProvider>
    </AuthCtx.Provider>
  );
}
