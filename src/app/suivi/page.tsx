'use client';

import { useMemo, useState } from 'react';
import { TrackProvider, useTrack } from '@/src/lib/track';
import { addDays, addMonths, dayLong, firstOfMonth, lastOfMonth, mondayOf, monthLabel, parseISO, todayISO } from '@/lib/dates';
import { moodColor } from '@/src/lib/moods';
import type { Habit } from '@/src/lib/types';
import { MoodPicker } from '@/src/components/MoodPicker';
import { HabitForm } from '@/src/components/HabitForm';

const dayNum = (iso: string) => Number(iso.slice(8, 10));
const weekdayLetter = (iso: string) =>
  parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase();

function SuiviInner() {
  const t = useTrack();
  const today = todayISO();
  const [month, setMonth] = useState(firstOfMonth(today));
  const [sel, setSel] = useState(today);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  const monthDays = useMemo(() => {
    const out: string[] = [];
    for (let d = month; d <= lastOfMonth(month); d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  if (t.loading) return <p className="muted">Chargement…</p>;

  const week = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), i));
  const note = t.days.get(sel);
  const goBack = (d: number) => setSel(addDays(sel, d));

  const monthCount = (h: Habit) => {
    const vals = monthDays.map((d) => t.value(h.id, d)).filter((v): v is number => v !== undefined);
    if (h.kind === 'check') return `${vals.length}`;
    if (!vals.length) return '–';
    return `moy. ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1).replace('.0', '')}`;
  };
  const weekCount = (h: Habit) => week.filter((d) => t.value(h.id, d) !== undefined).length;

  const gratitudes = monthDays.filter((d) => t.days.get(d)?.gratitude);

  return (
    <>
      <div className="page-head">
        <h1>Suivi</h1>
      </div>
      {t.error && <p className="error">⚠️ {t.error}</p>}

      {/* ----- Le jour choisi ----- */}
      <section className="card-block today-panel">
        <div className="day-nav">
          <button onClick={() => goBack(-1)} aria-label="Jour précédent">
            ‹
          </button>
          <strong className="cap">{sel === today ? "Aujourd'hui · " : ''}{dayLong(sel)}</strong>
          <button onClick={() => goBack(1)} aria-label="Jour suivant">
            ›
          </button>
          {sel !== today && <button onClick={() => setSel(today)}>Aujourd'hui</button>}
        </div>

        <h3>Humeur</h3>
        <MoodPicker value={note?.mood ?? null} onChange={(m) => void t.setMood(sel, m)} />

        <h3>✨ Bonne chose du jour</h3>
        <input
          key={sel + (note?.gratitude ?? '')}
          className="gratitude"
          defaultValue={note?.gratitude ?? ''}
          placeholder="Une petite chose qui t'a fait plaisir…"
          onBlur={(e) => {
            if ((e.target.value.trim() || null) !== (note?.gratitude ?? null)) void t.setGratitude(sel, e.target.value);
          }}
        />

        {t.habits.length > 0 && <h3>Habitudes</h3>}
        <div className="habit-chips">
          {t.habits.map((h) => {
            const v = t.value(h.id, sel);
            return h.kind === 'check' ? (
              <button
                key={h.id}
                className={'habit-chip' + (v !== undefined ? ' on' : '')}
                style={v !== undefined ? { background: h.color } : { borderColor: h.color }}
                aria-pressed={v !== undefined}
                onClick={() => void t.toggle(h.id, sel)}
              >
                {h.emoji ?? '•'} {h.name}
                {v !== undefined && ' ✓'}
              </button>
            ) : (
              <label key={h.id} className="habit-chip num" style={{ borderColor: h.color }}>
                {h.emoji ?? '•'} {h.name}
                <input
                  key={sel + (v ?? '')}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  defaultValue={v ?? ''}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const n = raw === '' ? null : Number(raw);
                    if (n !== null && Number.isNaN(n)) return;
                    if (n !== (v ?? null)) void t.setValue(h.id, sel, n);
                  }}
                />
                {h.unit}
              </label>
            );
          })}
        </div>
      </section>

      {/* ----- Le mois ----- */}
      <div className="week-nav">
        <button onClick={() => setMonth(addMonths(month, -1))} aria-label="Mois précédent">
          ‹
        </button>
        <strong className="cap">{monthLabel(month)}</strong>
        <button onClick={() => setMonth(addMonths(month, 1))} aria-label="Mois suivant">
          ›
        </button>
        {month !== firstOfMonth(today) && <button onClick={() => setMonth(firstOfMonth(today))}>Ce mois-ci</button>}
      </div>

      <div className="grid-scroll">
        <table className="tracker">
          <thead>
            <tr>
              <th className="sticky-col" />
              {monthDays.map((d) => (
                <th key={d}>
                  <button
                    className={'day-head' + (d === today ? ' today' : '') + (d === sel ? ' sel' : '')}
                    onClick={() => setSel(d)}
                    aria-label={dayLong(d)}
                  >
                    <small>{weekdayLetter(d)}</small>
                    {dayNum(d)}
                  </button>
                </th>
              ))}
              <th className="total-col">Mois</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="sticky-col row-name">😊 Humeur</th>
              {monthDays.map((d) => {
                const c = moodColor(t.days.get(d)?.mood);
                return (
                  <td key={d}>
                    <button
                      className={'cell' + (c ? ' on' : '')}
                      style={c ? { background: c } : undefined}
                      onClick={() => setSel(d)}
                      aria-label={`Humeur du ${dayLong(d)}`}
                    />
                  </td>
                );
              })}
              <td className="total-col">
                {monthDays.filter((d) => t.days.get(d)?.mood).length}
              </td>
            </tr>
            {t.habits.map((h) => (
              <tr key={h.id}>
                <th className="sticky-col row-name">
                  {h.emoji ?? '•'} {h.name}
                  {h.goal_per_week && (
                    <small className={weekCount(h) >= h.goal_per_week ? 'goal ok' : 'goal'}>
                      {weekCount(h)}/{h.goal_per_week} cette sem.
                    </small>
                  )}
                </th>
                {monthDays.map((d) => {
                  const v = t.value(h.id, d);
                  return (
                    <td key={d}>
                      {h.kind === 'check' ? (
                        <button
                          className={'cell' + (v !== undefined ? ' on' : '')}
                          style={v !== undefined ? { background: h.color } : undefined}
                          aria-pressed={v !== undefined}
                          aria-label={`${h.name}, ${dayLong(d)}`}
                          onClick={() => void t.toggle(h.id, d)}
                        />
                      ) : (
                        <button
                          className={'cell num' + (v !== undefined ? ' on' : '')}
                          style={v !== undefined ? { background: h.color } : undefined}
                          aria-label={`${h.name}, ${dayLong(d)}`}
                          onClick={() => {
                            setSel(d);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {v !== undefined ? v : ''}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="total-col">{monthCount(h)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.habits.some((h) => h.kind === 'number') && (
        <p className="muted small">Pour une valeur (sommeil, eau…) : touche la case, puis saisis-la tout en haut.</p>
      )}

      {/* ----- Mes habitudes ----- */}
      <section className="card-block">
        <h2>Mes habitudes</h2>
        {t.habits.length === 0 && editing !== 'new' && (
          <div className="row-actions">
            <button
              className="primary"
              onClick={() =>
                void t.addHabit({ name: 'Yoga', emoji: '🧘', color: '#cdb9ea', kind: 'check', unit: null, goal_per_week: null })
              }
            >
              ＋ Commencer avec 🧘 Yoga
            </button>
          </div>
        )}
        <ul className="habit-list">
          {t.habits.map((h) => (
            <li key={h.id}>
              {editing === h.id ? (
                <HabitForm
                  initial={h}
                  onCancel={() => setEditing(null)}
                  onSave={async (d) => {
                    await t.updateHabit(h.id, d);
                    setEditing(null);
                  }}
                  onDelete={() => {
                    if (window.confirm(`Supprimer « ${h.name} » et tout son historique ?`)) {
                      void t.deleteHabit(h.id);
                      setEditing(null);
                    }
                  }}
                />
              ) : (
                <button className="habit-line" onClick={() => setEditing(h.id)}>
                  <span className="dot" style={{ background: h.color }} />
                  {h.emoji ?? ''} {h.name}
                  <small className="muted">
                    {h.kind === 'number' ? `valeur (${h.unit ?? '—'})` : h.goal_per_week ? `${h.goal_per_week}×/sem.` : ''}
                  </small>
                  <span className="edit-hint">✎</span>
                </button>
              )}
            </li>
          ))}
        </ul>
        {editing === 'new' ? (
          <HabitForm
            onCancel={() => setEditing(null)}
            onSave={async (d) => {
              await t.addHabit(d);
              setEditing(null);
            }}
          />
        ) : (
          <button onClick={() => setEditing('new')}>＋ Nouvelle habitude</button>
        )}
      </section>

      {/* ----- Relecture des bonnes choses ----- */}
      {gratitudes.length > 0 && (
        <section className="card-block">
          <h2>✨ Les bonnes choses de {monthLabel(month)}</h2>
          <ul className="gratitude-list">
            {gratitudes.map((d) => (
              <li key={d}>
                <b>{dayNum(d)}</b> {t.days.get(d)?.gratitude}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function SuiviPage() {
  return (
    <TrackProvider>
      <SuiviInner />
    </TrackProvider>
  );
}
