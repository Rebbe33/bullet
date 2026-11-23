'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { isDone } from '@/lib/tree';
import { addDays, isoWeek, mondayOf, toISO, todayISO, weekLabel } from '@/lib/dates';
import { QuickAdd } from '@/components/QuickAdd';
import { TaskRow } from '@/components/TaskRow';

/** Revue de la semaine : bilan, ce qui reste à faire (reporter / retirer), priorités de la suivante */
export default function RevuePage() {
  const { items, index, loading, schedule, addItem } = useStore();
  const [monday, setMonday] = useState(() => mondayOf(todayISO()));
  if (loading) return <p className="muted">Chargement…</p>;

  const sunday = addDays(monday, 6);
  const nextMonday = addDays(monday, 7);
  const nextSunday = addDays(monday, 13);
  const isLeaf = (id: string) => (index.kids.get(id)?.length ?? 0) === 0;

  const inWeek = (i: (typeof items)[number], from: string, to: string) =>
    (i.sched_type === 'day' && !!i.sched_date && i.sched_date >= from && i.sched_date <= to) ||
    (i.sched_type === 'week' && i.sched_date === from);

  // terminées cette semaine (selon la date où on les a cochées)
  const accomplished = items
    .filter((i) => {
      if (!i.done || !i.done_at || !isLeaf(i.id) || i.is_appointment) return false;
      const d = toISO(new Date(i.done_at));
      return d >= monday && d <= sunday;
    })
    .sort((a, b) => (a.done_at ?? '').localeCompare(b.done_at ?? ''));

  // prévues cette semaine mais pas faites (les rendez-vous passés n'en font pas partie)
  const left = items.filter(
    (i) => inWeek(i, monday, sunday) && !i.is_appointment && !isDone(index, i) && isLeaf(i.id)
  );
  const rdvs = items
    .filter((i) => i.is_appointment && inWeek(i, monday, sunday))
    .sort((a, b) => `${a.sched_date}${a.start_time ?? ''}`.localeCompare(`${b.sched_date}${b.start_time ?? ''}`));

  const nextPriorities = items.filter(
    (i) => i.sched_type === 'week' && i.sched_date === nextMonday && i.sched_priority
  );
  const nextRdvs = items
    .filter((i) => i.is_appointment && inWeek(i, nextMonday, nextSunday))
    .sort((a, b) => `${a.sched_date}${a.start_time ?? ''}`.localeCompare(`${b.sched_date}${b.start_time ?? ''}`));

  const postpone = (id: string) => void schedule(id, { type: 'week', date: nextMonday });
  const postponeAll = () => left.forEach((i) => postpone(i.id));

  const planned = accomplished.length + left.length;

  return (
    <>
      <div className="page-head">
        <h1>Revue de la semaine</h1>
      </div>

      <div className="week-nav">
        <button onClick={() => setMonday(addDays(monday, -7))} aria-label="Semaine précédente">
          ‹
        </button>
        <strong>
          Sem. {isoWeek(monday)} · {weekLabel(monday)}
        </strong>
        <button onClick={() => setMonday(addDays(monday, 7))} aria-label="Semaine suivante">
          ›
        </button>
        {monday !== mondayOf(todayISO()) && (
          <button onClick={() => setMonday(mondayOf(todayISO()))}>Cette semaine</button>
        )}
      </div>

      <section className="card-block">
        <h2>✓ Bilan</h2>
        <p>
          <b>{accomplished.length}</b> tâche{accomplished.length > 1 ? 's' : ''} terminée
          {accomplished.length > 1 ? 's' : ''}
          {planned > 0 && (
            <>
              {' '}
              · <b>{left.length}</b> prévue{left.length > 1 ? 's' : ''} pas faite{left.length > 1 ? 's' : ''}
            </>
          )}
          {rdvs.length > 0 && (
            <>
              {' '}
              · {rdvs.length} RDV
            </>
          )}
        </p>
        {accomplished.length > 0 ? (
          <ul className="review-done">
            {accomplished.map((i) => (
              <li key={i.id}>✓ {i.title}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Rien de coché cette semaine.</p>
        )}
      </section>

      <section className="card-block">
        <h2>↻ Pas fait : que faire ?</h2>
        {left.length === 0 ? (
          <p className="muted">Tout ce qui était prévu est fait 🎉</p>
        ) : (
          <>
            <div className="row-actions">
              <button className="primary" onClick={postponeAll}>
                Tout reporter à la semaine suivante
              </button>
            </div>
            {left.map((i) => (
              <div key={i.id} className="review-line">
                <ul className="tasks">
                  <TaskRow item={i} compact />
                </ul>
                <div className="review-actions">
                  <button onClick={() => postpone(i.id)}>→ Semaine suivante</button>
                  <button onClick={() => void schedule(i.id, null)}>Retirer du planning</button>
                </div>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="card-block">
        <h2>★ Priorités de la semaine suivante</h2>
        <p className="muted">Sem. {isoWeek(nextMonday)} · {weekLabel(nextMonday)}</p>
        {nextPriorities.length > 0 && (
          <ul className="tasks">
            {nextPriorities.map((i) => (
              <TaskRow key={i.id} item={i} compact />
            ))}
          </ul>
        )}
        <QuickAdd
          placeholder="Ajouter une priorité (Entrée)"
          onAdd={(t) =>
            addItem(null, t, { type: 'week', date: nextMonday }, { sched_priority: true })
          }
        />
        {nextRdvs.length > 0 && (
          <>
            <h3>Déjà prévu la semaine suivante</h3>
            <ul className="tasks">
              {nextRdvs.map((i) => (
                <TaskRow key={i.id} item={i} compact />
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
