'use client';

import { useStore } from '@/lib/store';
import { QuickAdd } from '@/components/QuickAdd';
import { TreeNode } from '@/components/TreeNode';

export default function ObjectifsPage() {
  const { index, loading, addItem } = useStore();
  if (loading) return <p className="muted">Chargement…</p>;

  const roots = index.kids.get(null) ?? [];

  return (
    <>
      <h1>Objectifs</h1>
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
