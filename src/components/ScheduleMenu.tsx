'use client';

import { useState } from 'react';
import type { Item, Sched } from '@/lib/types';
import { useStore } from '@/lib/store';
import { addDays, firstOfMonth, mondayOf, schedLabel, todayISO } from '@/lib/dates';

export function ScheduleMenu({ item, compact }: { item: Item; compact?: boolean }) {
  const { schedule, updateItem } = useStore();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const nextMonday = addDays(mondayOf(today), 7);

  const choose = (s: Sched | null) => {
    setOpen(false);
    void schedule(item.id, s);
  };

  const scheduled = item.sched_type && item.sched_date;
  const time = item.start_time ? item.start_time.slice(0, 5) : null;
  const base = scheduled ? schedLabel(item.sched_type!, item.sched_date!) : null;
  const label = compact
    ? '📅'
    : base
      ? base + (item.sched_type === 'day' && time ? ` · ${time}` : '')
      : '📅 Planifier';

  return (
    <span className="sched">
      <button
        className={'chip' + (scheduled && !compact ? '' : ' chip-empty')}
        onClick={() => setOpen((o) => !o)}
        title={base ? `Planifié : ${base}` : 'Planifier'}
      >
        {label}
      </button>
      {open && (
        <>
          <div className="backdrop" onClick={() => setOpen(false)} />
          <div className="menu">
            <button onClick={() => choose({ type: 'day', date: today })}>Aujourd'hui</button>
            <button onClick={() => choose({ type: 'day', date: addDays(today, 1) })}>Demain</button>
            <button onClick={() => choose({ type: 'week', date: mondayOf(today) })}>
              Cette semaine
            </button>
            <button onClick={() => choose({ type: 'week', date: nextMonday })}>
              Semaine prochaine
            </button>
            <button onClick={() => choose({ type: 'month', date: firstOfMonth(today) })}>
              Ce mois-ci
            </button>
            <label>
              Jour précis
              <input
                type="date"
                onChange={(e) => e.target.value && choose({ type: 'day', date: e.target.value })}
              />
            </label>
            <label>
              Semaine du…
              <input
                type="date"
                onChange={(e) =>
                  e.target.value && choose({ type: 'week', date: mondayOf(e.target.value) })
                }
              />
            </label>
            <label>
              Mois
              <input
                type="month"
                onChange={(e) =>
                  e.target.value && choose({ type: 'month', date: `${e.target.value}-01` })
                }
              />
            </label>

            <div className="menu-sep" />
            <label className="row-check">
              <input
                type="checkbox"
                checked={item.is_appointment}
                onChange={(e) =>
                  void updateItem(item.id, {
                    is_appointment: e.target.checked,
                    ...(e.target.checked ? {} : { start_time: null }),
                  })
                }
              />
              Rendez-vous
            </label>
            {item.sched_type === 'day' ? (
              <label>
                Heure
                <input
                  type="time"
                  value={time ?? ''}
                  onChange={(e) =>
                    void updateItem(item.id, {
                      start_time: e.target.value || null,
                      ...(e.target.value ? { is_appointment: true } : {}),
                    })
                  }
                />
              </label>
            ) : (
              <span className="menu-hint">Choisis un jour pour ajouter une heure</span>
            )}

            {scheduled && (
              <button className="danger" onClick={() => choose(null)}>
                Retirer la planification
              </button>
            )}
          </div>
        </>
      )}
    </span>
  );
}
