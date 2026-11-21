'use client';

import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { isDone, pathTitles } from '@/lib/tree';
import { ScheduleMenu } from './ScheduleMenu';

export function TaskRow({ item, compact }: { item: Item; compact?: boolean }) {
  const { index, toggleDone } = useStore();
  const done = isDone(index, item);
  const path = pathTitles(index, item.id);
  const time = item.start_time ? item.start_time.slice(0, 5) : null;

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
      <ScheduleMenu item={item} compact={compact} />
    </li>
  );
}
