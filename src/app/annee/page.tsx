'use client';

import { useState } from 'react';
import { TrackProvider, useTrack } from '@/lib/track';
import { useStore } from '@/lib/store';
import { dayLong, monthLabel, todayISO } from '@/lib/dates';
import { MOODS, moodColor } from '@/lib/moods';
import { MoodPicker } from '@/components/MoodPicker';
import { QuickAdd } from '@/components/QuickAdd';
import { TaskRow } from '@/components/TaskRow';

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();

function Pixels({ year }: { year: number }) {
  const t = useTrack();
  const today = todayISO();
  const [sel, setSel] = useState<string | null>(null);
  if (t.loading) return <p className="muted">Chargement…</p>;

  const counts = MOODS.map((m) => ({
    ...m,
    n: [...t.days.values()].filter((d) => d.day.startsWith(`${year}-`) && d.mood === m.value).length,
  }));
  const total = counts.reduce((a, c) => a + c.n, 0);

  return (
    <>
      <div className="pixels" role="grid" aria-label={`Humeur ${year}`}>
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
            <span className="pixel-head">
              {new Date(year, m, 1).toLocaleDateString('fr-FR', { month: 'narrow' }).toUpperCase()}
            </span>
            {Array.from({ length: 31 }, (_, d) => {
              if (d + 1 > daysIn(year, m + 1)) return <span key={d} className="pixel none" />;
              const iso = `${year}-${pad(m + 1)}-${pad(d + 1)}`;
              const c = moodColor(t.days.get(iso)?.mood);
              return (
                <button
                  key={d}
                  className={'pixel' + (c ? ' on' : '') + (iso === today ? ' today' : '') + (iso === sel ? ' sel' : '')}
                  style={c ? { background: c } : undefined}
                  aria-label={dayLong(iso)}
                  onClick={() => setSel(iso === sel ? null : iso)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {sel && (
        <section className="card-block">
          <h3 className="cap">{dayLong(sel)}</h3>
          <MoodPicker value={t.days.get(sel)?.mood ?? null} onChange={(m) => void t.setMood(sel, m)} />
          {t.days.get(sel)?.gratitude && <p className="muted">✨ {t.days.get(sel)?.gratitude}</p>}
        </section>
      )}

      <div className="legend">
        {counts.map((c) => (
          <span key={c.value} className="legend-item">
            <i style={{ background: c.color }} /> {c.emoji} {c.label} · {c.n}
          </span>
        ))}
      </div>
      <p className="muted small">
        {total} jour{total > 1 ? 's' : ''} rempli{total > 1 ? 's' : ''} en {year}. Touche un carré pour choisir ou
        changer l'humeur d'un jour.
      </p>
    </>
  );
}

function FutureLog({ year }: { year: number }) {
  const { items, birthdays, addItem } = useStore();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="future-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const first = `${year}-${pad(m + 1)}-01`;
        const monthItems = items.filter((i) => i.sched_type === 'month' && i.sched_date === first && !i.is_appointment);
        const rdvs = items
          .filter((i) => i.is_appointment && i.sched_type === 'day' && i.sched_date?.startsWith(`${year}-${pad(m + 1)}-`))
          .sort((a, b) => `${a.sched_date}${a.start_time ?? ''}`.localeCompare(`${b.sched_date}${b.start_time ?? ''}`));
        const bds = birthdays.filter((b) => b.month === m + 1).sort((a, b) => a.day - b.day);
        return (
          <section key={m} className="card-block future-card">
            <h3 className="cap">{monthLabel(first)}</h3>
            {bds.map((b) => (
              <p key={b.id} className="fl-line bday-t">
                🎂 {b.day} · {b.name}
              </p>
            ))}
            {rdvs.map((r) => (
              <p key={r.id} className="fl-line appt-t">
                {Number(r.sched_date!.slice(8))} · {r.start_time ? `${r.start_time.slice(0, 5)} ` : ''}
                {r.title}
              </p>
            ))}
            {monthItems.length > 0 && (
              <ul className="tasks">
                {monthItems.map((i) => (
                  <TaskRow key={i.id} item={i} compact />
                ))}
              </ul>
            )}
            {bds.length + rdvs.length + monthItems.length === 0 && <p className="muted small">Rien de prévu</p>}
            {open === m ? (
              <QuickAdd
                autoFocus
                placeholder="À faire ce mois-là (Entrée)"
                onAdd={(t) => addItem(null, t, { type: 'month', date: first })}
                onDone={() => setOpen(null)}
              />
            ) : (
              <button className="chip chip-empty" onClick={() => setOpen(m)}>
                ＋ Ajouter
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function AnneePage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [tab, setTab] = useState<'pixels' | 'future'>('pixels');

  return (
    <>
      <div className="page-head">
        <h1>Année</h1>
      </div>
      <div className="week-nav">
        <button onClick={() => setYear(year - 1)} aria-label="Année précédente">
          ‹
        </button>
        <strong>{year}</strong>
        <button onClick={() => setYear(year + 1)} aria-label="Année suivante">
          ›
        </button>
        <button className={tab === 'pixels' ? 'primary' : ''} onClick={() => setTab('pixels')}>
          🎨 Humeur en pixels
        </button>
        <button className={tab === 'future' ? 'primary' : ''} onClick={() => setTab('future')}>
          🗓 Future log
        </button>
      </div>
      {tab === 'pixels' ? (
        <TrackProvider>
          <Pixels year={year} />
        </TrackProvider>
      ) : (
        <FutureLog year={year} />
      )}
    </>
  );
}
