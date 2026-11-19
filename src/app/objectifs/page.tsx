'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { QuickAdd } from '@/components/QuickAdd';
import { TreeNode } from '@/components/TreeNode';
import { ImportPanel } from '@/components/ImportPanel';

export default function ObjectifsPage() {
  const { index, loading, addItem } = useStore();
  const [importing, setImporting] = useState(false);
  if (loading) return <p className="muted">Chargement…</p>;

  const roots = index.kids.get(null) ?? [];

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
      {roots.length === 0 && (
        <p className="muted">
          Rien pour l'instant. Ajoute un objectif, puis décompose-le avec le bouton ＋ en tâches et
          sous-tâches, sur autant de niveaux que tu veux. Le 📅 permet de les placer sur un jour,
          une semaine ou un mois.
        </p>
      )}
      <ul className="tree">
        {roots.map((r) => (
          <TreeNode key={r.id} item={r} depth={0} />
        ))}
      </ul>
    </>
  );
}
