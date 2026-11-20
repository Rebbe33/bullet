'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useStore } from './store';

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
}

const Ctx = createContext<TreeUI | null>(null);

export function TreeUIProvider({ children }: { children: ReactNode }) {
  const { restoreDone } = useStore();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const [toast, setToast] = useState<{ title: string; snapshot: Snapshot } | null>(null);

  // le message d'annulation disparaît tout seul après 10 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 10000);
    return () => clearTimeout(t);
  }, [toast]);

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
    (title: string, snapshot: Snapshot) => setToast({ title, snapshot }),
    []
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
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-text">« {toast.title} » terminée</span>
          <button
            className="primary"
            onClick={() => {
              void restoreDone(toast.snapshot);
              setToast(null);
            }}
          >
            Annuler
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useTreeUI(): TreeUI {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTreeUI doit être utilisé dans <TreeUIProvider>');
  return c;
}
