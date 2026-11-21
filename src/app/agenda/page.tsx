'use client';

import { useState } from 'react';
import type { Item, SchedType, Sched } from '@/lib/types';
import { useStore } from '@/lib/store';
import { isDone } from '@/lib/tree';
import {
  addDays,
  addMonths,
  dayLong,
  dayShort,
  firstOfMonth,
  isoWeek,
  lastOfMonth,
  mondayOf,
  monthLabel,
  periodEnd,
  todayISO,
  weekLabel,
} from '@/lib/dates';
import { QuickAdd } from '@/components/QuickAdd';
import { TaskRow } from '@/components/TaskRow';

type Mode = 'jour' | 'semaine' | 'mois';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

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
  const monthEnd = lastOfMonth(anchor);

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

  const days = Array.from({ length: 7 }, (_, k) => addDays(weekStart, k));
  const months = Array.from(new Set([firstOfMonth(weekStart), firstOfMonth(addDays(weekStart, 6))]));

  // vue mois : lundis des semaines qui touchent le mois + éléments par jour / semaine
  const monthWeeks: string[] = [];
  for (let m = mondayOf(monthStart); m <= mondayOf(monthEnd); m = addDays(m, 7)) monthWeeks.push(m);
  const byDay = new Map<string, Item[]>();
  const byWeek = new Map<string, Item[]>();
  for (const i of items) {
    if (!i.sched_date) continue;
    const map = i.sched_type === 'day' ? byDay : i.sched_type === 'week' ? byWeek : null;
    if (!map) continue;
    const list = map.get(i.sched_date) ?? [];
    list.push(i);
    map.set(i.sched_date, list);
  }

  const go = (dir: 1 | -1) =>
    setAnchor(
      mode === 'mois' ? addMonths(anchor, dir) : addDays(anchor, dir * (mode === 'jour' ? 1 : 7))
    );

  const title =
    mode === 'jour'
      ? dayLong(anchor)
      : mode === 'semaine'
        ? `Semaine ${isoWeek(weekStart)} · ${weekLabel(weekStart)}`
        : monthLabel(anchor);

  const openDay = (d: string) => {
    setAnchor(d);
    setMode('jour');
  };
  const openWeek = (monday: string) => {
    setAnchor(monday);
    setMode('semaine');
  };

  return (
    <>
      <div className="agenda-head">
        <div className="nav-btns">
          <button onClick={() => go(-1)} aria-label="Précédent">
            ←
          </button>
          <button onClick={() => setAnchor(today)}>Aujourd'hui</button>
          <button onClick={() => go(1)} aria-label="Suivant">
            →
          </button>
        </div>
        <h1 className="cap">{title}</h1>
        <input
          type="date"
          className="goto"
          value={anchor}
          title="Aller à une date"
          onChange={(e) => e.target.value && setAnchor(e.target.value)}
        />
        <div className="seg">
          <button className={mode === 'jour' ? 'on' : ''} onClick={() => setMode('jour')}>
            Jour
          </button>
          <button className={mode === 'semaine' ? 'on' : ''} onClick={() => setMode('semaine')}>
            Semaine
          </button>
          <button className={mode === 'mois' ? 'on' : ''} onClick={() => setMode('mois')}>
            Mois
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

      {mode === 'mois' && (
        <>
          <section className="card month">
            <div className="month-grid month-head">
              <span>Sem.</span>
              {DOW.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            {monthWeeks.map((ws) => {
              const weekOpen = (byWeek.get(ws) ?? []).filter((i) => !isDone(index, i)).length;
              return (
                <div
                  key={ws}
                  className={'month-grid month-row' + (ws === mondayOf(today) ? ' cur' : '')}
                >
                  <button
                    className="wk"
                    title="Ouvrir cette semaine"
                    onClick={() => openWeek(ws)}
                  >
                    S{isoWeek(ws)}
                    {weekOpen > 0 && <small>{weekOpen}</small>}
                  </button>
                  {Array.from({ length: 7 }, (_, k) => addDays(ws, k)).map((d) => {
                    const list = byDay.get(d) ?? [];
                    const open = list.filter((i) => !isDone(index, i));
                    const inMonth = d >= monthStart && d <= monthEnd;
                    return (
                      <button
                        key={d}
                        className={
                          'cell' + (inMonth ? '' : ' out') + (d === today ? ' today' : '')
                        }
                        onClick={() => openDay(d)}
                      >
                        <span className="num">{Number(d.slice(8))}</span>
                        {open.length > 0 && <span className="count">{open.length}</span>}
                        {list.length > 0 && open.length === 0 && (
                          <span className="count done">✓</span>
                        )}
                        <span className="titles">
                          {open.slice(0, 3).map((i) => (
                            <span key={i.id}>{i.title}</span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </section>
          <Block
            title={`Tâches de ${monthLabel(monthStart)}`}
            hint="à faire quand tu veux dans le mois"
            items={at('month', monthStart)}
            placeholder="+ tâche du mois"
            onAdd={add({ type: 'month', date: monthStart })}
          />
        </>
      )}

      {mode === 'semaine' && (
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
                onTitleClick={() => openDay(d)}
              />
            ))}
          </div>
        </>
      )}

      {mode === 'jour' && (
        <>
          <Block
            title={anchor === today ? "Aujourd'hui" : 'Ce jour'}
            items={at('day', anchor)}
            placeholder="+ tâche du jour"
            today={anchor === today}
            onAdd={add({ type: 'day', date: anchor })}
          />
          <Block
            title={`Semaine ${isoWeek(weekStart)}`}
            hint={weekLabel(weekStart)}
            items={at('week', weekStart)}
            placeholder="+ tâche de la semaine"
            onAdd={add({ type: 'week', date: weekStart })}
            onTitleClick={() => openWeek(weekStart)}
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
