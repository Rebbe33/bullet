'use client';

import { useState } from 'react';
import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { isDone, progress } from '@/lib/tree';
import { ScheduleMenu } from './ScheduleMenu';
import { QuickAdd } from './QuickAdd';

export function TreeNode({ item, depth }: { item: Item; depth: number }) {
  const { index, addItem, updateItem, toggleDone, deleteItem, move } = useStore();
  const kids = index.kids.get(item.id) ?? [];
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tools, setTools] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');

  const prog = progress(index, item.id);
  const done = isDone(index, item);
  const sibs = index.kids.get(item.parent_id) ?? [];
  const i = sibs.findIndex((x) => x.id === item.id);

  const moveUp = () => {
    if (i <= 0) return;
    const prev = sibs[i - 1];
    const before = sibs[i - 2];
    void move(item.id, item.parent_id, before ? (before.position + prev.position) / 2 : prev.position - 1);
  };

  const moveDown = () => {
    if (i < 0 || i >= sibs.length - 1) return;
    const next = sibs[i + 1];
    const after = sibs[i + 2];
    void move(item.id, item.parent_id, after ? (next.position + after.position) / 2 : next.position + 1);
  };

  // → devient sous-tâche de l'élément juste au-dessus
  const indent = () => {
    if (i <= 0) return;
    const prev = sibs[i - 1];
    const pk = index.kids.get(prev.id) ?? [];
    void move(item.id, prev.id, pk.length ? pk[pk.length - 1].position + 1 : 1);
  };

  // ← remonte d'un niveau, juste après son parent
  const outdent = () => {
    if (!item.parent_id) return;
    const parent = index.byId.get(item.parent_id);
    if (!parent) return;
    const gs = index.kids.get(parent.parent_id) ?? [];
    const pi = gs.findIndex((x) => x.id === parent.id);
    const next = gs[pi + 1];
    void move(item.id, parent.parent_id, next ? (parent.position + next.position) / 2 : parent.position + 1);
  };

  const remove = () => {
    const n = kids.length;
    const ok = window.confirm(
      n ? `Supprimer « ${item.title} » et ses éléments en dessous ?` : `Supprimer « ${item.title} » ?`
    );
    if (ok) void deleteItem(item.id);
  };

  return (
    <li className="node">
      {editing ? (
        <form
          className="edit"
          onSubmit={(e) => {
            e.preventDefault();
            void updateItem(item.id, { title: title.trim() || item.title, notes: notes.trim() || null });
            setEditing(false);
          }}
        >
          <input value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
          <textarea
            rows={2}
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="edit-actions">
            <button type="submit" className="primary">
              Enregistrer
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className={'node-row' + (depth === 0 ? ' root' : '') + (done ? ' is-done' : '')}>
          <button
            className="chev"
            disabled={kids.length === 0}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Replier' : 'Déplier'}
          >
            {kids.length ? (open ? '▾' : '▸') : '•'}
          </button>
          <input type="checkbox" checked={done} onChange={() => void toggleDone(item.id)} />
          <div className="node-main">
            <span className="node-title">{item.title}</span>
            {item.notes && <span className="node-notes">{item.notes}</span>}
          </div>
          <div className="node-actions">
          {kids.length > 0 && (
            <span className="prog">
              {prog.done}/{prog.total}
            </span>
          )}
          <ScheduleMenu item={item} />
          <button
            className="icon"
            title="Ajouter une sous-tâche"
            onClick={() => {
              setAdding(true);
              setOpen(true);
            }}
          >
            ＋
          </button>
          <button className="icon" title="Plus d'actions" onClick={() => setTools((t) => !t)}>
            ⋯
          </button>
          </div>
        </div>
      )}

      {kids.length > 0 && !editing && (
        <div className="bar" aria-hidden>
          <span style={{ width: `${prog.pct}%` }} />
        </div>
      )}

      {tools && !editing && (
        <div className="node-tools">
          <button onClick={moveUp} disabled={i <= 0}>
            ↑ Monter
          </button>
          <button onClick={moveDown} disabled={i < 0 || i >= sibs.length - 1}>
            ↓ Descendre
          </button>
          <button onClick={outdent} disabled={!item.parent_id}>
            ← Remonter d'un niveau
          </button>
          <button onClick={indent} disabled={i <= 0}>
            → Sous l'élément du dessus
          </button>
          <button
            onClick={() => {
              setTitle(item.title);
              setNotes(item.notes ?? '');
              setEditing(true);
              setTools(false);
            }}
          >
            ✎ Modifier
          </button>
          <button className="danger" onClick={remove}>
            🗑 Supprimer
          </button>
        </div>
      )}

      {open && (kids.length > 0 || adding) && (
        <ul className="children">
          {kids.map((k) => (
            <TreeNode key={k.id} item={k} depth={depth + 1} />
          ))}
          {adding && (
            <li>
              <QuickAdd
                autoFocus
                placeholder="Nouvelle sous-tâche (Entrée pour ajouter)"
                onAdd={(t) => addItem(item.id, t)}
                onDone={() => setAdding(false)}
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
