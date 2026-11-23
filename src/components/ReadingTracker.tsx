'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { readingLevel } from '@/lib/ext-logic';
import { dayLong, todayISO } from '@/lib/dates';

interface Session {
  date: string;
  pages: number;
  book_id: string | null;
  moment: string | null;
}
interface Data {
  year: number;
  sessions: Session[];
  books: Record<string, { title: string; author: string }>;
  finished: { title: string; author: string; pages: number | null; date_finished: string }[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const SHADE = [0, 28, 48, 72, 100];

export function ReadingTracker({ year }: { year: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(0);
  const today = todayISO();

  useEffect(() => {
    try {
      setGoal(Number(localStorage.getItem(`bullet_reading_goal_${year}`)) || 0);
    } catch {
      setGoal(0);
    }
  }, [year]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    setSel(null);
    (async () => {
      try {
        const { data: s } = await getSupabase().auth.getSession();
        const res = await fetch(`/api/ext/lecture?year=${year}`, {
          headers: { Authorization: `Bearer ${s.session?.access_token ?? ''}` },
        });
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(j.error ?? 'Erreur');
        else setData(j as Data);
      } catch {
        if (!cancelled) setError('Impossible de joindre la bibliothèque (hors connexion ?)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const stats = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const s of data?.sessions ?? []) perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.pages);
    const perMonth = Array.from({ length: 12 }, () => 0);
    let total = 0;
    let best: [string, number] | null = null;
    for (const [d, p] of perDay) {
      perMonth[Number(d.slice(5, 7)) - 1] += p;
      total += p;
      if (!best || p > best[1]) best = [d, p];
    }
    return { perDay, perMonth, total, days: perDay.size, best, max: Math.max(1, ...perMonth) };
  }, [data]);

  if (error) return <p className="error">⚠️ {error}</p>;
  if (!data) return <p className="muted">Chargement de ta bibliothèque…</p>;

  // objectif : pages restantes / jours restants (seulement pour l'année en cours)
  const isThisYear = year === Number(today.slice(0, 4));
  const daysLeft = isThisYear
    ? Math.max(1, Math.round((Date.UTC(year, 11, 31) - Date.UTC(year, Number(today.slice(5, 7)) - 1, Number(today.slice(8)))) / 86400000) + 1)
    : 0;
  const remaining = Math.max(0, goal - stats.total);

  const daySessions = sel ? data.sessions.filter((s) => s.date === sel) : [];

  return (
    <>
      <section className="card-block reading-stats">
        <div className="stat">
          <b>{stats.total.toLocaleString('fr-FR')}</b>
          <span>pages lues</span>
        </div>
        <div className="stat">
          <b>{stats.days}</b>
          <span>jours de lecture</span>
        </div>
        <div className="stat">
          <b>{stats.days ? Math.round(stats.total / stats.days) : 0}</b>
          <span>pages par jour lu</span>
        </div>
        <div className="stat">
          <b>{data.finished.length}</b>
          <span>livre{data.finished.length > 1 ? 's' : ''} terminé{data.finished.length > 1 ? 's' : ''}</span>
        </div>
      </section>

      <section className="card-block">
        <h3>🎯 Objectif de {year}</h3>
        <div className="row-actions">
          <input
            type="number"
            min={0}
            step={100}
            className="goal-input"
            value={goal || ''}
            placeholder="Pages visées (ex. 10000)"
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              setGoal(n);
              try {
                localStorage.setItem(`bullet_reading_goal_${year}`, String(n));
              } catch {}
            }}
          />
        </div>
        {goal > 0 && (
          <>
            <div className="bar goal-bar" aria-hidden>
              <span style={{ width: `${Math.min(100, Math.round((stats.total / goal) * 100))}%` }} />
            </div>
            <p className="muted small">
              {Math.round((stats.total / goal) * 100)} % · reste {remaining.toLocaleString('fr-FR')} pages
              {isThisYear && remaining > 0 && ` · soit ${Math.ceil(remaining / daysLeft)} pages par jour`}
            </p>
          </>
        )}
      </section>

      <div className="pixels" role="grid" aria-label={`Lecture ${year}`}>
        <div className="pixel-col pixel-days">
          <span className="pixel-head" />
          {Array.from({ length: 31 }, (_, i) => (
            <span key={i} className="pixel-num">
              {i + 1}
            </span>
          ))}
        </div>
        {Array.from({ length: 12 }, (_, m) => (
          <div key={m} className="pixel-col">
            <span className="pixel-head">{MONTHS[m]}</span>
            {Array.from({ length: 31 }, (_, d) => {
              if (d + 1 > daysIn(year, m + 1)) return <span key={d} className="pixel none" />;
              const iso = `${year}-${pad(m + 1)}-${pad(d + 1)}`;
              const pages = stats.perDay.get(iso) ?? 0;
              const lvl = readingLevel(pages);
              return (
                <button
                  key={d}
                  className={'pixel' + (lvl ? ' on' : '') + (iso === today ? ' today' : '') + (iso === sel ? ' sel' : '')}
                  style={lvl ? { background: `color-mix(in srgb, var(--accent) ${SHADE[lvl]}%, var(--card))` } : undefined}
                  aria-label={`${dayLong(iso)} : ${pages} pages`}
                  onClick={() => setSel(iso === sel ? null : iso)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="legend">
        <span className="legend-item">moins</span>
        {[1, 2, 3, 4].map((l) => (
          <span key={l} className="legend-item">
            <i style={{ background: `color-mix(in srgb, var(--accent) ${SHADE[l]}%, var(--card))` }} />
          </span>
        ))}
        <span className="legend-item">plus (15 · 30 · 60 pages)</span>
      </div>

      {sel && (
        <section className="card-block">
          <h3 className="cap">
            {dayLong(sel)} · {stats.perDay.get(sel) ?? 0} pages
          </h3>
          {daySessions.length === 0 && <p className="muted">Pas de lecture ce jour-là.</p>}
          <ul className="gratitude-list">
            {daySessions.map((s, i) => (
              <li key={i}>
                📖 {s.book_id ? (data.books[s.book_id]?.title ?? 'Livre') : 'Livre'} · {s.pages} p.
                {s.moment ? ` · ${s.moment}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-block">
        <h3>Pages par mois</h3>
        <div className="month-bars">
          {stats.perMonth.map((p, m) => (
            <div key={m} className="mbar">
              <span className="mbar-val">{p || ''}</span>
              <span className="mbar-fill" style={{ height: `${Math.round((p / stats.max) * 100)}%` }} />
              <span className="mbar-name">{MONTHS[m]}</span>
            </div>
          ))}
        </div>
        {stats.best && (
          <p className="muted small cap">
            Meilleur jour : {dayLong(stats.best[0])} ({stats.best[1]} pages)
          </p>
        )}
      </section>

      {data.finished.length > 0 && (
        <section className="card-block">
          <h3>📚 Terminés en {year}</h3>
          <ul className="gratitude-list">
            {data.finished.map((b, i) => (
              <li key={i}>
                {b.title} <span className="muted">— {b.author}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
