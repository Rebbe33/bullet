'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useStore } from './store';
import { buildFilter, type SearchFilter } from './search';
import { descendantIds } from './tree';

// État d'affichage de l'arbre (dépliés / terminés visibles) + bouton « Annuler ».
// Volontairement non mémorisé : à chaque visite de la page, tout est replié.

type Snapshot = { id: string; done: boolean }[];

interface TreeUI {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  open: (id: string) => void;
  collapseAll: () => void;
  expandAll: (ids: string[]) => void;
  showDone: boolean;
  setShowDone: (v: boolean) => void;
  /** à appeler quand on coche un élément qui va disparaître de la vue */
  notifyDone: (title: string, snapshot: Snapshot) => void;
  /** recherche */
  query: string;
  setQuery: (q: string) => void;
  filter: SearchFilter | null;
  /** glisser-déposer (ordinateur) */
  dragId: string | null;
  setDragId: (id: string | null) => void;
  /** vrai si `id` peut être déposé dans `target` (pas dans lui-même ni dans ses descendants) */
  canDrop: (id: string, target: string | null) => boolean;
}

const Ctx = createContext<TreeUI | null>(null);

export function TreeUIProvider({ children }: { children: ReactNode }) {
  const { restoreDone, notify, items, index } = useStore();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const filter = useMemo(() => buildFilter(index, items, query), [index, items, query]);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const open = useCallback((id: string) => {
    setOpenIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const collapseAll = useCallback(() => setOpenIds(new Set()), []);
  const expandAll = useCallback((ids: string[]) => setOpenIds(new Set(ids)), []);
  const notifyDone = useCallback(
    (title: string, snapshot: Snapshot) =>
      notify(`« ${title} » terminée`, () => void restoreDone(snapshot)),
    [notify, restoreDone]
  );

  const canDrop = useCallback(
    (id: string, target: string | null) => {
      if (id === target) return false;
      if (target === null) return true;
      return !descendantIds(index, id).includes(target);
    },
    [index]
  );

  const value: TreeUI = {
    isOpen: (id) => openIds.has(id),
    toggle,
    open,
    collapseAll,
    expandAll,
    showDone,
    setShowDone,
    notifyDone,
    query,
    setQuery,
    filter,
    dragId,
    setDragId,
    canDrop,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useTreeUI(): TreeUI {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTreeUI doit être utilisé dans <TreeUIProvider>');
  return c;
}
