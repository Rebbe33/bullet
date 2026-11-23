'use client';

import { useState } from 'react';
import type { Item, Sched } from '@/lib/types';
import { useStore } from '@/lib/store';
import { REPEAT_PRESETS, presetKey, repeatLabel } from '@/lib/recurrence';
import { addDays, firstOfMonth, mondayOf, schedLabel, todayISO } from '@/lib/dates';

export function ScheduleMenu({ item, compact }: { item: Item; compact?: boolean }) {
  const { schedule, updateItem } = useStore();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const nextMonday = addDays(mondayOf(today), 7);

  const choose = (s: Sched | null, priority?: boolean) => {
    setOpen(false);
    void schedule(item.id, s, priority);
  };

  const scheduled = item.sched_type && item.sched_date;
  const periodic = item.sched_type === 'week' || item.sched_type === 'month';
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
            <button onClick={() => choose({ type: 'week', date: mondayOf(today) }, true)}>
              ★ Priorité de la semaine
            </button>
            <button onClick={() => choose({ type: 'month', date: firstOfMonth(today) }, true)}>
              ★ Priorité du mois
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
            {periodic && (
              <label className="row-check">
                <input
                  type="checkbox"
                  checked={item.sched_priority}
                  onChange={(e) => void updateItem(item.id, { sched_priority: e.target.checked })}
                />
                ★ Priorité {item.sched_type === 'week' ? 'de la semaine' : 'du mois'}
              </label>
            )}
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

            <label>
              Répéter
              <select
                value={presetKey(item.repeat_unit, item.repeat_every)}
                disabled={!scheduled}
                onChange={(e) => {
                  const p = REPEAT_PRESETS.find((x) => x.key === e.target.value);
                  if (p) void updateItem(item.id, { repeat_unit: p.unit, repeat_every: p.every });
                }}
              >
                {item.repeat_unit &&
                  !REPEAT_PRESETS.some((x) => x.key === presetKey(item.repeat_unit, item.repeat_every)) && (
                    <option value={presetKey(item.repeat_unit, item.repeat_every)}>
                      {repeatLabel(item.repeat_unit, item.repeat_every)}
                    </option>
                  )}
                {REPEAT_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {!scheduled && <span className="menu-hint">Planifie d'abord pour pouvoir répéter</span>}

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
