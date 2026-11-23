'use client';

import { useEffect, useRef, useState } from 'react';
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
import { ageOn, birthdaysOn } from '@/lib/birthdays';
import { QuickAdd } from '@/components/QuickAdd';
import { AppointmentAdd } from '@/components/AppointmentAdd';
import { TaskRow } from '@/components/TaskRow';

type Mode = 'jour' | 'semaine' | 'mois';

const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface Bday {
  id: string;
  name: string;
  age: number | null;
}

interface BlockProps {
  title: string;
  hint?: string;
  items: Item[];
  placeholder: string;
  onAdd: (title: string) => void | Promise<void>;
  /** si fourni, affiche le bouton « ＋ RDV » */
  onAddAppt?: (title: string, time: string | null) => void | Promise<void>;
  /** anniversaires du jour (affichés en rose, automatiquement) */
  bdays?: Bday[];
  today?: boolean;
  onTitleClick?: () => void;
}

/** Bloc d'un jour */
function Block({
  title,
  hint,
  items,
  placeholder,
  onAdd,
  onAddAppt,
  bdays,
  today,
  onTitleClick,
}: BlockProps) {
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
      {bdays && bdays.length > 0 && (
        <ul className="bdays">
          {bdays.map((b) => (
            <li key={b.id} className="bday">
              🎂 {b.name}
              {b.age !== null && b.age > 0 ? ` · ${b.age} ans` : ''}
            </li>
          ))}
        </ul>
      )}
      <ul className="tasks">
        {items.map((it) => (
          <TaskRow key={it.id} item={it} compact />
        ))}
      </ul>
      <QuickAdd placeholder={placeholder} onAdd={onAdd} />
      {onAddAppt && <AppointmentAdd onAdd={onAddAppt} />}
    </section>
  );
}

interface PeriodProps {
  title: string;
  hint?: string;
  kind: 'semaine' | 'mois';
  items: Item[];
  onAdd: (title: string) => void | Promise<void>;
  onAddPriority: (title: string) => void | Promise<void>;
  onTitleClick?: () => void;
}

/** Bloc d'une semaine ou d'un mois : une zone « Priorités » puis les autres tâches */
function PeriodBlock({ title, hint, kind, items, onAdd, onAddPriority, onTitleClick }: PeriodProps) {
  const prio = items.filter((i) => i.sched_priority);
  const rest = items.filter((i) => !i.sched_priority);
  const word = kind === 'semaine' ? 'de la semaine' : 'du mois';
  return (
    <section className="card">
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
      <div className="prio-box">
        <div className="prio-head">★ Priorités {word}</div>
        <ul className="tasks">
          {prio.map((it) => (
            <TaskRow key={it.id} item={it} compact />
          ))}
        </ul>
        <QuickAdd placeholder="+ priorité" onAdd={onAddPriority} />
      </div>
      <ul className="tasks">
        {rest.map((it) => (
          <TaskRow key={it.id} item={it} compact />
        ))}
      </ul>
      <QuickAdd placeholder={`+ tâche ${word}`} onAdd={onAdd} />
    </section>
  );
}

export default function AgendaPage() {
  const { items, index, birthdays, loading, addItem, schedule } = useStore();
  const [mode, setMode] = useState<Mode>('jour');
  const [anchor, setAnchor] = useState(() => todayISO());

  // Appli ouverte en arrière-plan : quand on revient un nouveau jour, on se replace sur aujourd'hui
  const lastToday = useRef(todayISO());
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const t = todayISO();
      if (t !== lastToday.current) {
        lastToday.current = t;
        setAnchor(t);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (loading) return <p className="muted">Chargement…</p>;

  const today = todayISO();
  const weekStart = mondayOf(anchor);
  const monthStart = firstOfMonth(anchor);
  const monthEnd = lastOfMonth(anchor);

  // à faire d'abord : rendez-vous avec heure (par heure), puis le reste ; les terminés en bas
  const sortItems = (list: Item[]) =>
    [...list].sort(
      (a, b) =>
        Number(isDone(index, a)) - Number(isDone(index, b)) ||
        (a.start_time && b.start_time
          ? a.start_time.localeCompare(b.start_time)
          : a.start_time
            ? -1
            : b.start_time
              ? 1
              : 0) ||
        a.created_at.localeCompare(b.created_at)
    );
  const at = (type: SchedType, date: string) =>
    sortItems(items.filter((i) => i.sched_type === type && i.sched_date === date));
  const add = (sched: Sched) => (t: string) => addItem(null, t, sched);
  const addPriority = (sched: Sched) => (t: string) =>
    addItem(null, t, sched, { sched_priority: true });
  const addAppt = (date: string) => (t: string, time: string | null) =>
    addItem(null, t, { type: 'day', date }, { is_appointment: true, start_time: time });
  const bdaysOn = (date: string): Bday[] =>
    birthdaysOn(birthdays, date).map((b) => ({ id: b.id, name: b.name, age: ageOn(b, date) }));

  // en retard : les rendez-vous passés n'en font pas partie
  const overdue = items
    .filter(
      (i) =>
        i.sched_type &&
        i.sched_date &&
        !i.is_appointment &&
        periodEnd(i.sched_type, i.sched_date) < today &&
        !isDone(index, i)
    )
    .sort((a, b) =>
      periodEnd(a.sched_type!, a.sched_date!).localeCompare(periodEnd(b.sched_type!, b.sched_date!))
    );

  const days = Array.from({ length: 7 }, (_, k) => addDays(weekStart, k));

  // vue semaine : le mois « principal » (celui du jeudi) est toujours affiché,
  // l'autre mois seulement s'il contient déjà quelque chose
  const mainMonth = firstOfMonth(addDays(weekStart, 3));
  const weekMonths = [
    mainMonth,
    ...Array.from(
      new Set([firstOfMonth(weekStart), firstOfMonth(addDays(weekStart, 6))])
    ).filter((m) => m !== mainMonth && at('month', m).length > 0),
  ];

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

  const weekSched: Sched = { type: 'week', date: weekStart };

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
                    const open = sortItems(list.filter((i) => !isDone(index, i)));
                    const bds = bdaysOn(d);
                    const inMonth = d >= monthStart && d <= monthEnd;
                    return (
                      <button
                        key={d}
                        className={
                          'cell' + (inMonth ? '' : ' out') + (d === today ? ' today' : '')
                        }
                        onClick={() => openDay(d)}
                      >
                        <span className="num">
                          {Number(d.slice(8))}
                          {bds.length > 0 && <span className="cake">🎂</span>}
                        </span>
                        {open.length > 0 && (
                          <span
                            className={
                              'count' + (open.some((i) => i.is_appointment) ? ' has-appt' : '')
                            }
                          >
                            {open.length}
                          </span>
                        )}
                        {list.length > 0 && open.length === 0 && (
                          <span className="count done">✓</span>
                        )}
                        <span className="titles">
                          {bds.map((b) => (
                            <span key={b.id} className="bday-t">
                              🎂 {b.name}
                            </span>
                          ))}
                          {open.slice(0, 3).map((i) => (
                            <span key={i.id} className={i.is_appointment ? 'appt-t' : undefined}>
                              {i.start_time ? `${i.start_time.slice(0, 5)} ` : ''}
                              {i.title}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </section>
          <PeriodBlock
            title={monthLabel(monthStart)}
            kind="mois"
            items={at('month', monthStart)}
            onAdd={add({ type: 'month', date: monthStart })}
            onAddPriority={addPriority({ type: 'month', date: monthStart })}
          />
        </>
      )}

      {mode === 'semaine' && (
        <>
          <PeriodBlock
            title={`Semaine ${isoWeek(weekStart)}`}
            hint={weekLabel(weekStart)}
            kind="semaine"
            items={at('week', weekStart)}
            onAdd={add(weekSched)}
            onAddPriority={addPriority(weekSched)}
          />
          {weekMonths.map((m) => (
            <PeriodBlock
              key={m}
              title={monthLabel(m)}
              kind="mois"
              items={at('month', m)}
              onAdd={add({ type: 'month', date: m })}
              onAddPriority={addPriority({ type: 'month', date: m })}
            />
          ))}
          <div className="week-grid">
            {days.map((d) => (
              <Block
                key={d}
                title={dayShort(d)}
                items={at('day', d)}
                bdays={bdaysOn(d)}
                placeholder="+ ajouter"
                today={d === today}
                onAdd={add({ type: 'day', date: d })}
                onAddAppt={addAppt(d)}
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
            bdays={bdaysOn(anchor)}
            placeholder="+ tâche du jour"
            today={anchor === today}
            onAdd={add({ type: 'day', date: anchor })}
            onAddAppt={addAppt(anchor)}
          />
          <PeriodBlock
            title={`Semaine ${isoWeek(weekStart)}`}
            hint={weekLabel(weekStart)}
            kind="semaine"
            items={at('week', weekStart)}
            onAdd={add(weekSched)}
            onAddPriority={addPriority(weekSched)}
            onTitleClick={() => openWeek(weekStart)}
          />
          <PeriodBlock
            title={monthLabel(monthStart)}
            kind="mois"
            items={at('month', monthStart)}
            onAdd={add({ type: 'month', date: monthStart })}
            onAddPriority={addPriority({ type: 'month', date: monthStart })}
          />
        </>
      )}
    </>
  );
}
