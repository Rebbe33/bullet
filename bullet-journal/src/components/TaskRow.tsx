'use client';

import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { isDone, pathTitles } from '@/lib/tree';
import { ScheduleMenu } from './ScheduleMenu';

export function TaskRow({ item, compact }: { item: Item; compact?: boolean }) {
  const { index, toggleDone } = useStore();
  const done = isDone(index, item);
  const path = pathTitles(index, item.id);

  return (
    <li className={'task' + (done ? ' is-done' : '')}>
      <input type="checkbox" checked={done} onChange={() => void toggleDone(item.id)} />
      <div className="task-main">
        <span className="task-title">{item.title}</span>
        {path.length > 0 && <span className="task-path">{path.join(' › ')}</span>}
      </div>
      <ScheduleMenu item={item} compact={compact} />
    </li>
  );
}
