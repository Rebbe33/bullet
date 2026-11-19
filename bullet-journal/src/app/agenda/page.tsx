'use client';

import { useState } from 'react';
import type { Item, SchedType, Sched } from '@/lib/types';
import { useStore } from '@/lib/store';
import { isDone } from '@/lib/tree';
import {
  addDays,
  dayLong,
  dayShort,
  firstOfMonth,
  mondayOf,
  monthLabel,
  periodEnd,
  todayISO,
  weekLabel,
} from '@/lib/dates';
import { QuickAdd } from '@/components/QuickAdd';
import { TaskRow } from '@/components/TaskRow';

type Mode = 'jour' | 'semaine';

interface BlockProps {
  title: string;
  hint?: string;
  items: Item[];
  placeholder: string;
  onAdd: (title: string) => void | Promise<void>;
  today?: boolean;
  onTitleClick?: () => void;
}

function Block({ title, hint, items, placeholder, onAdd, today, onTitleClick }: BlockProps) {
  return (
    <section className={'card' + (today ? ' is-today' : '')}>
      <h3>
        {onTitleClick ? (
          <button className="linklike" onClick={onTitleClick}>
            {title}
          </button>
        ) : (
          title
        )}
        {hint && <small>{hint}</small>}
      </h3>
      <ul className="tasks">
        {items.map((it) => (
          <TaskRow key={it.id} item={it} compact />
        ))}
      </ul>
      <QuickAdd placeholder={placeholder} onAdd={onAdd} />
    </section>
  );
}

export default function AgendaPage() {
  const { items, index, loading, addItem, schedule } = useStore();
  const [mode, setMode] = useState<Mode>('semaine');
  const [anchor, setAnchor] = useState(() => todayISO());

  if (loading) return <p className="muted">Chargement…</p>;

  const today = todayISO();
  const weekStart = mondayOf(anchor);
  const monthStart = firstOfMonth(anchor);

  const sortItems = (list: Item[]) =>
    [...list].sort(
      (a, b) =>
        Number(isDone(index, a)) - Number(isDone(index, b)) ||
        a.created_at.localeCompare(b.created_at)
    );
  const at = (type: SchedType, date: string) =>
    sortItems(items.filter((i) => i.sched_type === type && i.sched_date === date));
  const add = (sched: Sched) => (t: string) => addItem(null, t, sched);

  const overdue = items
    .filter(
      (i) =>
        i.sched_type &&
        i.sched_date &&
        periodEnd(i.sched_type, i.sched_date) < today &&
        !isDone(index, i)
    )
    .sort((a, b) =>
      periodEnd(a.sched_type!, a.sched_date!).localeCompare(periodEnd(b.sched_type!, b.sched_date!))
    );

  // éléments sans enfants, pas faits, pas encore placés
  const unscheduled = items.filter(
    (i) => !i.sched_type && !i.done && (index.kids.get(i.id)?.length ?? 0) === 0
  );

  const step = mode === 'jour' ? 1 : 7;
  const days = Array.from({ length: 7 }, (_, k) => addDays(weekStart, k));
  const months = Array.from(new Set([firstOfMonth(weekStart), firstOfMonth(addDays(weekStart, 6))]));

  const title =
    mode === 'jour' ? dayLong(anchor) : `Semaine du ${weekLabel(weekStart)}`;

  return (
    <>
      <div className="agenda-head">
        <div className="nav-btns">
          <button onClick={() => setAnchor(addDays(anchor, -step))}>←</button>
          <button onClick={() => setAnchor(today)}>Aujourd'hui</button>
          <button onClick={() => setAnchor(addDays(anchor, step))}>→</button>
        </div>
        <h1 className="cap">{title}</h1>
        <div className="seg">
          <button className={mode === 'jour' ? 'on' : ''} onClick={() => setMode('jour')}>
            Jour
          </button>
          <button className={mode === 'semaine' ? 'on' : ''} onClick={() => setMode('semaine')}>
            Semaine
          </button>
        </div>
      </div>

      {overdue.length > 0 && (
        <section className="card warn">
          <h3>
            En retard ({overdue.length})
            <button
              className="linklike"
              onClick={() =>
                void Promise.all(overdue.map((i) => schedule(i.id, { type: 'day', date: today })))
              }
            >
              Tout reporter à aujourd'hui
            </button>
          </h3>
          <ul className="tasks">
            {overdue.map((it) => (
              <TaskRow key={it.id} item={it} />
            ))}
          </ul>
        </section>
      )}

      {mode === 'semaine' ? (
        <>
          <Block
            title="Cette semaine"
            hint="à faire quand tu veux dans la semaine"
            items={at('week', weekStart)}
            placeholder="+ tâche de la semaine"
            onAdd={add({ type: 'week', date: weekStart })}
          />
          {months.map((m) =>
            at('month', m).length > 0 ? (
              <Block
                key={m}
                title={monthLabel(m)}
                hint="tâches du mois"
                items={at('month', m)}
                placeholder="+ tâche du mois"
                onAdd={add({ type: 'month', date: m })}
              />
            ) : null
          )}
          <div className="week-grid">
            {days.map((d) => (
              <Block
                key={d}
                title={dayShort(d)}
                items={at('day', d)}
                placeholder="+ ajouter"
                today={d === today}
                onAdd={add({ type: 'day', date: d })}
                onTitleClick={() => {
                  setAnchor(d);
                  setMode('jour');
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <Block
            title={anchor === today ? "Aujourd'hui" : 'Ce jour'}
            items={at('day', anchor)}
            placeholder="+ tâche du jour"
            today={anchor === today}
            onAdd={add({ type: 'day', date: anchor })}
          />
          <Block
            title="Cette semaine"
            hint={weekLabel(weekStart)}
            items={at('week', weekStart)}
            placeholder="+ tâche de la semaine"
            onAdd={add({ type: 'week', date: weekStart })}
          />
          <Block
            title={monthLabel(monthStart)}
            hint="tâches du mois"
            items={at('month', monthStart)}
            placeholder="+ tâche du mois"
            onAdd={add({ type: 'month', date: monthStart })}
          />
        </>
      )}

      <details className="card" open>
        <summary>À planifier ({unscheduled.length})</summary>
        {unscheduled.length === 0 ? (
          <p className="muted">Tout est placé 🎉</p>
        ) : (
          <ul className="tasks">
            {unscheduled.map((it) => (
              <TaskRow key={it.id} item={it} />
            ))}
          </ul>
        )}
      </details>
    </>
  );
}
