'use client';

import { useState } from 'react';
import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { descendantIds, isDone, progress } from '@/lib/tree';
import { useTreeUI } from '@/lib/treeui';
import { ScheduleMenu } from './ScheduleMenu';
import { QuickAdd } from './QuickAdd';

export function TreeNode({ item, depth }: { item: Item; depth: number }) {
  const { index, addItem, updateItem, toggleDone, deleteItem, move } = useStore();
  const ui = useTreeUI();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tools, setTools] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');

  const allKids = index.kids.get(item.id) ?? [];
  // les éléments entièrement terminés sont masqués (sauf si on choisit de les afficher)
  const kids = ui.showDone ? allKids : allKids.filter((k) => !isDone(index, k));
  const open = ui.isOpen(item.id);

  const prog = progress(index, item.id);
  const done = isDone(index, item);
  const priority = item.priority > 0;

  // frères visibles, dans l'ordre d'affichage (prioritaires d'abord)
  const vis = (index.kids.get(item.parent_id) ?? []).filter(
    (s) => ui.showDone || s.id === item.id || !isDone(index, s)
  );
  const iv = vis.findIndex((x) => x.id === item.id);
  // ↑ ↓ ne déplacent qu'à l'intérieur du même niveau de priorité
  const same = vis.filter((s) => s.priority === item.priority);
  const i = same.findIndex((x) => x.id === item.id);

  // Cocher : si l'élément va disparaître de la vue, on propose « Annuler »
  const onToggle = () => {
    if (!ui.showDone && !done) {
      const ids = [item.id, ...descendantIds(index, item.id)];
      ui.notifyDone(
        item.title,
        ids.map((id) => ({ id, done: index.byId.get(id)?.done ?? false }))
      );
    }
    void toggleDone(item.id);
  };

  const moveUp = () => {
    if (i <= 0) return;
    const prev = same[i - 1];
    const before = same[i - 2];
    void move(item.id, item.parent_id, before ? (before.position + prev.position) / 2 : prev.position - 1);
  };

  const moveDown = () => {
    if (i < 0 || i >= same.length - 1) return;
    const next = same[i + 1];
    const after = same[i + 2];
    void move(item.id, item.parent_id, after ? (next.position + after.position) / 2 : next.position + 1);
  };

  // tout en haut de son niveau de priorité
  const moveTop = () => {
    if (i <= 0) return;
    void move(item.id, item.parent_id, same[0].position - 1);
  };

  // → devient sous-tâche de l'élément juste au-dessus
  const indent = () => {
    if (iv <= 0) return;
    const prev = vis[iv - 1];
    const pk = index.kids.get(prev.id) ?? [];
    ui.open(prev.id);
    void move(item.id, prev.id, pk.length ? Math.max(...pk.map((k) => k.position)) + 1 : 1);
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
    const ok = window.confirm(
      allKids.length
        ? `Supprimer « ${item.title} » et ses éléments en dessous ?`
        : `Supprimer « ${item.title} » ?`
    );
    if (ok) void deleteItem(item.id);
  };

  return (
    <li className={'node' + (priority ? ' prio' : '')}>
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
        <div
          className={
            'node-row' +
            (depth === 0 ? ' root' : '') +
            (done ? ' is-done' : '') +
            (item.is_appointment ? ' appt' : '')
          }
        >
          <button
            className="chev"
            disabled={kids.length === 0}
            onClick={() => ui.toggle(item.id)}
            aria-label={open ? 'Replier' : 'Déplier'}
          >
            {kids.length ? (open ? '▾' : '▸') : '•'}
          </button>
          <input type="checkbox" checked={done} onChange={onToggle} />
          <div className="node-main">
            <span className="node-title">{item.title}</span>
            {item.notes && <span className="node-notes">{item.notes}</span>}
          </div>
          <div className="node-actions">
            {allKids.length > 0 && (
              <span className="prog">
                {prog.done}/{prog.total}
              </span>
            )}
            <ScheduleMenu item={item} />
            <button
              className={'icon star' + (priority ? ' on' : '')}
              title={priority ? 'Retirer la priorité' : 'Marquer comme prioritaire'}
              onClick={() => void updateItem(item.id, { priority: priority ? 0 : 1 })}
            >
              {priority ? '★' : '☆'}
            </button>
            <button
              className="icon"
              title="Ajouter une sous-tâche"
              onClick={() => {
                setAdding(true);
                ui.open(item.id);
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

      {allKids.length > 0 && !editing && (
        <div className="bar" aria-hidden>
          <span style={{ width: `${prog.pct}%` }} />
        </div>
      )}

      {tools && !editing && (
        <div className="node-tools">
          <button onClick={moveTop} disabled={i <= 0}>
            ⤒ Tout en haut
          </button>
          <button onClick={moveUp} disabled={i <= 0}>
            ↑ Monter
          </button>
          <button onClick={moveDown} disabled={i < 0 || i >= same.length - 1}>
            ↓ Descendre
          </button>
          <button onClick={outdent} disabled={!item.parent_id}>
            ← Remonter d'un niveau
          </button>
          <button onClick={indent} disabled={iv <= 0}>
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
