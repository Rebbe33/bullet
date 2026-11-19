'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from './supabase';
import type { Item, Sched } from './types';
import { buildIndex, descendantIds, isDone, type Index } from './tree';

const TABLE = 'bullet_items';

interface Store {
  items: Item[];
  index: Index;
  loading: boolean;
  error: string | null;
  addItem: (parentId: string | null, title: string, sched?: Sched | null) => Promise<void>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  schedule: (id: string, sched: Sched | null) => Promise<void>;
  move: (id: string, parentId: string | null, position: number) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const msg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e
    ? String((e as { message: unknown }).message)
    : String(e);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const index = useMemo(() => buildIndex(items), [items]);

  const reload = useCallback(async () => {
    try {
      const { data, error } = await getSupabase()
        .from(TABLE)
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      setItems((data ?? []) as Item[]);
      setError(null);
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // En cas d'échec d'une écriture : on affiche l'erreur et on resynchronise.
  const fail = useCallback(
    async (e: unknown) => {
      setError(msg(e));
      await reload();
    },
    [reload]
  );

  const patchLocal = useCallback((ids: string[], patch: Partial<Item>) => {
    const set = new Set(ids);
    setItems((prev) => prev.map((i) => (set.has(i.id) ? { ...i, ...patch } : i)));
  }, []);

  const addItem: Store['addItem'] = useCallback(
    async (parentId, title, sched) => {
      const sibs = index.kids.get(parentId) ?? [];
      const position = sibs.length ? sibs[sibs.length - 1].position + 1 : 1;
      const { data, error } = await getSupabase()
        .from(TABLE)
        .insert({
          parent_id: parentId,
          title,
          position,
          sched_type: sched?.type ?? null,
          sched_date: sched?.date ?? null,
        })
        .select()
        .single();
      if (error) return fail(error);
      setItems((prev) => [...prev, data as Item]);
    },
    [index, fail]
  );

  const updateItem: Store['updateItem'] = useCallback(
    async (id, patch) => {
      patchLocal([id], patch);
      const { error } = await getSupabase().from(TABLE).update(patch).eq('id', id);
      if (error) await fail(error);
    },
    [patchLocal, fail]
  );

  const toggleDone: Store['toggleDone'] = useCallback(
    async (id) => {
      const it = index.byId.get(id);
      if (!it) return;
      const value = !isDone(index, it);
      const ids = [id, ...descendantIds(index, id)];
      const patch = { done: value, done_at: value ? new Date().toISOString() : null };
      patchLocal(ids, patch);
      const { error } = await getSupabase().from(TABLE).update(patch).in('id', ids);
      if (error) await fail(error);
    },
    [index, patchLocal, fail]
  );

  const deleteItem: Store['deleteItem'] = useCallback(
    async (id) => {
      const gone = new Set([id, ...descendantIds(index, id)]);
      setItems((prev) => prev.filter((i) => !gone.has(i.id)));
      // les sous-éléments partent en cascade côté base
      const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
      if (error) await fail(error);
    },
    [index, fail]
  );

  const schedule: Store['schedule'] = useCallback(
    (id, sched) =>
      updateItem(id, { sched_type: sched?.type ?? null, sched_date: sched?.date ?? null }),
    [updateItem]
  );

  const move: Store['move'] = useCallback(
    (id, parentId, position) => updateItem(id, { parent_id: parentId, position }),
    [updateItem]
  );

  const value: Store = {
    items,
    index,
    loading,
    error,
    addItem,
    updateItem,
    toggleDone,
    deleteItem,
    schedule,
    move,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return s;
}
