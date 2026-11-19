'use client';

import { useState } from 'react';
import type { Item, Sched } from '@/lib/types';
import { useStore } from '@/lib/store';
import { addDays, firstOfMonth, mondayOf, schedLabel, todayISO } from '@/lib/dates';

export function ScheduleMenu({ item, compact }: { item: Item; compact?: boolean }) {
  const { schedule } = useStore();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const nextMonday = addDays(mondayOf(today), 7);

  const choose = (s: Sched | null) => {
    setOpen(false);
    void schedule(item.id, s);
  };

  const scheduled = item.sched_type && item.sched_date;
  const label = compact
    ? '📅'
    : scheduled
      ? schedLabel(item.sched_type!, item.sched_date!)
      : '📅 Planifier';

  return (
    <span className="sched">
      <button
        className={'chip' + (scheduled && !compact ? '' : ' chip-empty')}
        onClick={() => setOpen((o) => !o)}
        title={scheduled ? `Planifié : ${schedLabel(item.sched_type!, item.sched_date!)}` : 'Planifier'}
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
