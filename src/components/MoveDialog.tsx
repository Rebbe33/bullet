'use client';

import { useMemo, useState } from 'react';
import type { Item } from '@/lib/types';
import { useStore } from '@/lib/store';
import { descendantIds, pathTitles } from '@/lib/tree';
import { useTreeUI } from '@/lib/treeui';
import { fold } from '@/lib/search';

/** « Déplacer vers… » : choisir un nouvel emplacement par recherche (marche aussi au doigt) */
export function MoveDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const { items, index, move } = useStore();
  const ui = useTreeUI();
  const [q, setQ] = useState('');

  const candidates = useMemo(() => {
    const banned = new Set([item.id, ...descendantIds(index, item.id)]);
    const fq = fold(q.trim());
    return items
      .filter((i) => !banned.has(i.id) && !i.is_appointment)
      .map((i) => ({ item: i, path: [...pathTitles(index, i.id), i.title] }))
      .filter((c) => !fq || fold(c.path.join(' › ')).includes(fq))
      .sort((a, b) => a.path.length - b.path.length || a.path.join().localeCompare(b.path.join()))
      .slice(0, 60);
  }, [items, index, item.id, q]);

  const moveTo = (target: Item | null) => {
    const sibs = (index.kids.get(target?.id ?? null) ?? []).filter((s) => s.id !== item.id);
    const position = sibs.length ? Math.max(...sibs.map((s) => s.position)) + 1 : 1;
    if (target) {
      // on déplie le chemin pour voir l'élément à sa nouvelle place
      let cur: string | null = target.id;
      while (cur) {
        ui.open(cur);
        cur = index.byId.get(cur)?.parent_id ?? null;
      }
    }
    void move(item.id, target?.id ?? null, position);
    onClose();
  };

  return (
    <>
      <div className="backdrop dim" onClick={onClose} />
      <div className="move-dialog" role="dialog" aria-label="Déplacer">
        <div className="move-head">
          <strong>Déplacer « {item.title} »</strong>
          <button className="icon" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <input
          autoFocus
          placeholder="Chercher la destination…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="move-list">
          {item.parent_id !== null && (
            <li>
              <button onClick={() => moveTo(null)}>⤒ À la racine (objectif principal)</button>
            </li>
          )}
          {candidates.map((c) => (
            <li key={c.item.id}>
              <button onClick={() => moveTo(c.item)} disabled={c.item.id === item.parent_id}>
                <span className="move-title">{c.item.title}</span>
                {c.path.length > 1 && (
                  <span className="move-path">{c.path.slice(0, -1).join(' › ')}</span>
                )}
              </button>
            </li>
          ))}
          {candidates.length === 0 && <li className="muted">Aucun résultat</li>}
        </ul>
      </div>
    </>
  );
}
