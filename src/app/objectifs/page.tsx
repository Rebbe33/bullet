'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { isDone } from '@/lib/tree';
import { TreeUIProvider, useTreeUI } from '@/lib/treeui';
import { QuickAdd } from '@/components/QuickAdd';
import { TreeNode } from '@/components/TreeNode';
import { ImportPanel } from '@/components/ImportPanel';

function ObjectifsInner() {
  const { items, index, loading, addItem, move } = useStore();
  const ui = useTreeUI();
  const [importing, setImporting] = useState(false);
  if (loading) return <p className="muted">Chargement…</p>;

  // les rendez-vous créés depuis l'agenda ne sont pas des objectifs : on ne les liste pas ici
  const allRoots = (index.kids.get(null) ?? []).filter((r) => !r.is_appointment);
  const f = ui.filter;
  const roots = f
    ? allRoots.filter((r) => f.visible.has(r.id))
    : allRoots.filter((r) => ui.showDone || !isDone(index, r));
  const parentIds = items.filter((i) => (index.kids.get(i.id)?.length ?? 0) > 0).map((i) => i.id);
  const doneLeaves = items.filter((i) => i.done && !(index.kids.get(i.id)?.length)).length;

  return (
    <>
      <div className="page-head">
        <h1>Objectifs</h1>
        {!importing && <button onClick={() => setImporting(true)}>⬆ Importer une liste</button>}
      </div>

      {importing && <ImportPanel onClose={() => setImporting(false)} />}

      <QuickAdd
        placeholder="Nouvel objectif (Entrée pour ajouter)"
        onAdd={(t) => addItem(null, t)}
      />

      <div className="search">
        <input
          type="search"
          placeholder="🔎 Chercher dans mes objectifs…"
          value={ui.query}
          onChange={(e) => ui.setQuery(e.target.value)}
        />
        {ui.query && (
          <button className="icon" onClick={() => ui.setQuery('')} aria-label="Effacer la recherche">
            ✕
          </button>
        )}
      </div>
      {f && (
        <p className="muted small">
          {f.matched.size} résultat{f.matched.size > 1 ? 's' : ''}
        </p>
      )}

      <div className="toolbar">
        <button onClick={ui.collapseAll}>Tout replier</button>
        <button onClick={() => ui.expandAll(parentIds)}>Tout déplier</button>
        <label className="check">
          <input
            type="checkbox"
            checked={ui.showDone}
            onChange={(e) => ui.setShowDone(e.target.checked)}
          />
          Afficher les terminées ({doneLeaves})
        </label>
      </div>

      {allRoots.length === 0 && (
        <p className="muted">
          Rien pour l'instant. Ajoute un objectif, puis décompose-le avec le bouton ＋ en tâches et
          sous-tâches, sur autant de niveaux que tu veux. Le 📅 permet de les placer sur un jour,
          une semaine ou un mois.
        </p>
      )}
      {f && roots.length === 0 && <p className="muted">Aucun résultat pour « {ui.query} ».</p>}
      {!f && allRoots.length > 0 && roots.length === 0 && (
        <p className="muted">Tout est terminé 🎉 (coche « Afficher les terminées » pour les revoir).</p>
      )}
      {ui.dragId && (
        <div
          className="root-drop"
          onDragOver={(e) => {
            if (ui.dragId && ui.canDrop(ui.dragId, null)) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const id = ui.dragId;
            ui.setDragId(null);
            if (!id) return;
            const pk = index.kids.get(null) ?? [];
            void move(id, null, pk.length ? Math.max(...pk.map((k) => k.position)) + 1 : 1);
          }}
        >
          ⤒ Déposer ici pour en faire un objectif principal
        </div>
      )}
      <ul className="tree">
        {roots.map((r) => (
          <TreeNode key={r.id} item={r} depth={0} />
        ))}
      </ul>
    </>
  );
}

export default function ObjectifsPage() {
  return (
    <TreeUIProvider>
      <ObjectifsInner />
    </TreeUIProvider>
  );
}
