'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';
import type { Collection, CollectionItem } from './types';

interface Coll {
  loading: boolean;
  error: string | null;
  collections: Collection[];
  items: CollectionItem[];
  addCollection: (c: Pick<Collection, 'title' | 'emoji' | 'color'>) => Promise<string | null>;
  updateCollection: (id: string, patch: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addEntry: (collectionId: string, text: string) => Promise<void>;
  updateEntry: (id: string, patch: Partial<CollectionItem>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

const Ctx = createContext<Coll | null>(null);
const msg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const sb = getSupabase();
      const c = await sb.from('bullet_collections').select('*').order('position').order('created_at');
      if (c.error) throw c.error;
      let list = (c.data ?? []) as Collection[];
      // le « Vrac » existe toujours : on le crée au premier passage
      if (!list.some((x) => x.kind === 'dump')) {
        const ins = await sb
          .from('bullet_collections')
          .insert({ title: 'Vrac', emoji: '💭', color: '#cdb9ea', kind: 'dump', position: -1 })
          .select()
          .single();
        if (ins.error) throw ins.error;
        list = [ins.data as Collection, ...list];
      }
      const all: CollectionItem[] = [];
      for (let from = 0; ; ) {
        const r = await sb
          .from('bullet_collection_items')
          .select('*')
          .order('position')
          .order('created_at')
          .range(from, from + 999);
        if (r.error) throw r.error;
        if (!r.data || r.data.length === 0) break;
        all.push(...(r.data as CollectionItem[]));
        from += r.data.length;
      }
      setCollections(list);
      setItems(all);
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

  const fail = useCallback(
    async (e: unknown) => {
      setError(msg(e));
      await reload();
    },
    [reload]
  );

  const addCollection: Coll['addCollection'] = useCallback(
    async (c) => {
      const position = collections.length ? Math.max(...collections.map((x) => x.position)) + 1 : 1;
      const { data, error } = await getSupabase()
        .from('bullet_collections')
        .insert({ ...c, position })
        .select()
        .single();
      if (error) {
        await fail(error);
        return null;
      }
      setCollections((p) => [...p, data as Collection]);
      return (data as Collection).id;
    },
    [collections, fail]
  );

  const updateCollection: Coll['updateCollection'] = useCallback(
    async (id, patch) => {
      setCollections((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const { error } = await getSupabase().from('bullet_collections').update(patch).eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const deleteCollection: Coll['deleteCollection'] = useCallback(
    async (id) => {
      setCollections((p) => p.filter((c) => c.id !== id));
      setItems((p) => p.filter((i) => i.collection_id !== id));
      const { error } = await getSupabase().from('bullet_collections').delete().eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const addEntry: Coll['addEntry'] = useCallback(
    async (collectionId, text) => {
      const sibs = items.filter((i) => i.collection_id === collectionId);
      const position = sibs.length ? Math.max(...sibs.map((s) => s.position)) + 1 : 1;
      const { data, error } = await getSupabase()
        .from('bullet_collection_items')
        .insert({ collection_id: collectionId, text, position })
        .select()
        .single();
      if (error) return fail(error);
      setItems((p) => [...p, data as CollectionItem]);
    },
    [items, fail]
  );

  const updateEntry: Coll['updateEntry'] = useCallback(
    async (id, patch) => {
      setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      const { error } = await getSupabase().from('bullet_collection_items').update(patch).eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const deleteEntry: Coll['deleteEntry'] = useCallback(
    async (id) => {
      setItems((p) => p.filter((i) => i.id !== id));
      const { error } = await getSupabase().from('bullet_collection_items').delete().eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  return (
    <Ctx.Provider
      value={{
        loading,
        error,
        collections,
        items,
        addCollection,
        updateCollection,
        deleteCollection,
        addEntry,
        updateEntry,
        deleteEntry,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCollections(): Coll {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCollections doit être utilisé dans <CollectionsProvider>');
  return c;
}
