'use client';

import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { isDone, pathTitles } from '@/lib/tree';
import { ScheduleMenu } from './ScheduleMenu';

export function TaskRow({ item, compact }: { item: Item; compact?: boolean }) {
  const { index, toggleDone, updateItem } = useStore();
  const done = isDone(index, item);
  const path = pathTitles(index, item.id);
  const time = item.start_time ? item.start_time.slice(0, 5) : null;
  // l'étoile « priorité de la période » n'a de sens que pour une semaine ou un mois
  const periodic = item.sched_type === 'week' || item.sched_type === 'month';

  return (
    <li className={'task' + (done ? ' is-done' : '') + (item.is_appointment ? ' appt' : '')}>
      <input type="checkbox" checked={done} onChange={() => void toggleDone(item.id)} />
      <div className="task-main">
        <span className="task-title">
          {time && <b className="time">{time}</b>}
          {item.is_appointment && !time && <b className="time">RDV</b>}
          {item.title}
        </span>
        {path.length > 0 && <span className="task-path">{path.join(' › ')}</span>}
      </div>
      {periodic && (
        <button
          className={'icon star' + (item.sched_priority ? ' on' : '')}
          title={
            item.sched_priority
              ? 'Retirer des priorités'
              : `Mettre dans les priorités ${item.sched_type === 'week' ? 'de la semaine' : 'du mois'}`
          }
          onClick={() => void updateItem(item.id, { sched_priority: !item.sched_priority })}
        >
          {item.sched_priority ? '★' : '☆'}
        </button>
      )}
      <ScheduleMenu item={item} compact={compact} />
    </li>
  );
}
