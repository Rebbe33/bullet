'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// État d'affichage de l'arbre (dépliés / terminés visibles).
// Volontairement non mémorisé : à chaque visite de la page, tout est replié.

interface TreeUI {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  open: (id: string) => void;
  collapseAll: () => void;
  expandAll: (ids: string[]) => void;
  showDone: boolean;
  setShowDone: (v: boolean) => void;
}

const Ctx = createContext<TreeUI | null>(null);

export function TreeUIProvider({ children }: { children: ReactNode }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);

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

  const value: TreeUI = {
    isOpen: (id) => openIds.has(id),
    toggle,
    open,
    collapseAll,
    expandAll,
    showDone,
    setShowDone,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTreeUI(): TreeUI {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTreeUI doit être utilisé dans <TreeUIProvider>');
  return c;
}
