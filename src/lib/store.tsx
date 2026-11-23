'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from './supabase';
import type { Birthday, Item, NewBirthday, Sched } from './types';
import { buildIndex, descendantIds, isDone, type Index } from './tree';
import type { ParsedRow } from './importer';
import { schedLabel, todayISO } from './dates';
import { nextOccurrence } from './recurrence';

const TABLE = 'bullet_items';
const BDAYS = 'bullet_birthdays';

interface Toast {
  message: string;
  undo?: () => void;
}

interface Store {
  items: Item[];
  index: Index;
  birthdays: Birthday[];
  loading: boolean;
  error: string | null;
  /** affiche un message en bas de l'écran (avec un bouton « Annuler » si `undo` est fourni) */
  notify: (message: string, undo?: () => void) => void;
  addItem: (
    parentId: string | null,
    title: string,
    sched?: Sched | null,
    extra?: {
      is_appointment?: boolean;
      start_time?: string | null;
      end_time?: string | null;
      location?: string | null;
      sched_priority?: boolean;
    }
  ) => Promise<void>;
  importRows: (parentId: string | null, rows: ParsedRow[]) => Promise<number>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
  restoreDone: (snapshot: { id: string; done: boolean }[]) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  schedule: (id: string, sched: Sched | null, priority?: boolean) => Promise<void>;
  move: (id: string, parentId: string | null, position: number) => Promise<void>;
  addBirthdays: (list: NewBirthday[]) => Promise<number>;
  updateBirthday: (id: string, patch: Partial<NewBirthday>) => Promise<void>;
  deleteBirthday: (id: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

const msg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e
    ? String((e as { message: unknown }).message)
    : String(e);

export function StoreProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const index = useMemo(() => buildIndex(items), [items]);

  const cacheKey = `bullet_cache_v1_${userId}`;
  // vrai dès qu'on a des données fiables (cache ou serveur) : on peut alors les mémoriser
  const ready = useRef(false);

  const reload = useCallback(async () => {
    try {
      // Supabase renvoie au maximum ~1000 lignes par requête : on charge par pages
      // (tri stable created_at + id) jusqu'à ce qu'il n'y ait plus rien.
      const sb = getSupabase();
      const all: Item[] = [];
      for (let from = 0; ; ) {
        const { data, error } = await sb
          .from(TABLE)
          .select('*')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as Item[]));
        from += data.length;
      }

      // Les rendez-vous répétitifs passés avancent tout seuls à leur prochaine date
      const today = todayISO();
      const parents = new Set(all.map((i) => i.parent_id).filter((p): p is string => !!p));
      const rolls: PromiseLike<unknown>[] = [];
      for (const it of all) {
        if (
          it.repeat_unit &&
          it.is_appointment &&
          !it.done &&
          it.sched_type === 'day' &&
          it.sched_date &&
          it.sched_date < today &&
          !parents.has(it.id)
        ) {
          const next = nextOccurrence(it, today);
          it.sched_date = next.date;
          rolls.push(sb.from(TABLE).update({ sched_date: next.date }).eq('id', it.id));
        }
      }
      if (rolls.length) await Promise.all(rolls);

      ready.current = true;
      setItems(all);

      const bd = await sb.from(BDAYS).select('*').order('month').order('day');
      if (bd.error) throw bd.error;
      setBirthdays((bd.data ?? []) as Birthday[]);
      setError(null);
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Au démarrage : on affiche tout de suite les dernières données connues (cache),
  // puis on recharge depuis Supabase en arrière-plan.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw) as { items?: Item[]; birthdays?: Birthday[] };
        if (Array.isArray(c.items)) {
          setItems(c.items);
          setBirthdays(Array.isArray(c.birthdays) ? c.birthdays : []);
          ready.current = true;
          setLoading(false);
        }
      }
    } catch {
      /* cache illisible : on l'ignore */
    }
    void reload();
  }, [cacheKey, reload]);

  // Mémorisation (légèrement différée) à chaque changement
  useEffect(() => {
    if (!ready.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ items, birthdays, at: Date.now() }));
      } catch {
        /* stockage plein ou indisponible : tant pis */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [items, birthdays, cacheKey]);

  // Appli installée = souvent ouverte en arrière-plan : on recharge les données
  // quand on y revient (ex. modifications faites depuis un autre appareil).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  // le message « Annuler » disparaît tout seul après 10 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 10000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify: Store['notify'] = useCallback((message, undo) => setToast({ message, undo }), []);

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
    async (parentId, title, sched, extra) => {
      const sibs = index.kids.get(parentId) ?? [];
      const position = sibs.length ? Math.max(...sibs.map((s) => s.position)) + 1 : 1;
      const { data, error } = await getSupabase()
        .from(TABLE)
        .insert({
          parent_id: parentId,
          title,
          position,
          sched_type: sched?.type ?? null,
          sched_date: sched?.date ?? null,
          is_appointment: extra?.is_appointment ?? false,
          start_time: extra?.start_time ?? null,
          end_time: extra?.end_time ?? null,
          location: extra?.location ?? null,
          sched_priority: extra?.sched_priority ?? false,
        })
        .select()
        .single();
      if (error) return fail(error);
      setItems((prev) => [...prev, data as Item]);
    },
    [index, fail]
  );

  // Import en un seul envoi : les ids sont générés ici pour pouvoir
  // relier parents et enfants dans la même requête.
  const importRows: Store['importRows'] = useCallback(
    async (parentId, rows) => {
      if (rows.length === 0) return 0;
      const ids = rows.map(() => crypto.randomUUID());
      const sibs = index.kids.get(parentId) ?? [];
      const basePos = sibs.length ? Math.max(...sibs.map((s) => s.position)) : 0;
      const counters = new Map<string | null, number>();
      const now = new Date().toISOString();

      const payload = rows.map((r, i) => {
        const pid = r.parentIdx === null ? parentId : ids[r.parentIdx];
        const start = counters.has(pid) ? counters.get(pid)! : pid === parentId ? basePos : 0;
        const position = start + 1;
        counters.set(pid, position);
        return {
          id: ids[i],
          parent_id: pid,
          title: r.title,
          done: r.done,
          done_at: r.done ? now : null,
          position,
        };
      });

      const { data, error } = await getSupabase().from(TABLE).insert(payload).select();
      if (error) {
        await fail(error);
        return 0;
      }
      setItems((prev) => [...prev, ...((data ?? []) as Item[])]);
      return payload.length;
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
      const hasKids = (index.kids.get(id)?.length ?? 0) > 0;

      // Élément répétitif : « fait » = il passe à sa prochaine date (il n'est pas terminé pour de bon)
      if (it.repeat_unit && !hasKids && !it.done) {
        const prev = {
          sched_type: it.sched_type,
          sched_date: it.sched_date,
          start_time: it.start_time,
        };
        const next = nextOccurrence(it, todayISO());
        await updateItem(id, { sched_type: next.type, sched_date: next.date });
        notify(
          `« ${it.title} » faite · prochaine : ${schedLabel(next.type, next.date)}`,
          () => void updateItem(id, prev)
        );
        return;
      }

      const value = !isDone(index, it);
      const ids = [id, ...descendantIds(index, id)];
      const patch = { done: value, done_at: value ? new Date().toISOString() : null };
      patchLocal(ids, patch);
      const { error } = await getSupabase().from(TABLE).update(patch).in('id', ids);
      if (error) await fail(error);
    },
    [index, patchLocal, fail, updateItem, notify]
  );

  // Remet chaque élément dans l'état "fait / pas fait" qu'il avait (sert à l'annulation)
  const restoreDone: Store['restoreDone'] = useCallback(
    async (snapshot) => {
      for (const value of [true, false]) {
        const ids = snapshot.filter((s) => s.done === value).map((s) => s.id);
        if (ids.length === 0) continue;
        const patch = { done: value, done_at: value ? new Date().toISOString() : null };
        patchLocal(ids, patch);
        const { error } = await getSupabase().from(TABLE).update(patch).in('id', ids);
        if (error) {
          await fail(error);
          return;
        }
      }
    },
    [patchLocal, fail]
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
    (id, sched, priority) =>
      updateItem(id, {
        sched_type: sched?.type ?? null,
        sched_date: sched?.date ?? null,
        // sans planification, plus de répétition
        ...(sched ? {} : { repeat_unit: null, repeat_every: 1 }),
        // une heure n'a de sens que pour un jour précis
        ...(sched?.type === 'day' ? {} : { start_time: null, end_time: null }),
        // la priorité de période n'existe que pour une semaine ou un mois
        ...(sched && sched.type !== 'day'
          ? priority !== undefined
            ? { sched_priority: priority }
            : {}
          : { sched_priority: false }),
      }),
    [updateItem]
  );

  const move: Store['move'] = useCallback(
    (id, parentId, position) => updateItem(id, { parent_id: parentId, position }),
    [updateItem]
  );

  // ----- Anniversaires -----

  const addBirthdays: Store['addBirthdays'] = useCallback(
    async (list) => {
      if (list.length === 0) return 0;
      const { data, error } = await getSupabase().from(BDAYS).insert(list).select();
      if (error) {
        await fail(error);
        return 0;
      }
      setBirthdays((prev) => [...prev, ...((data ?? []) as Birthday[])]);
      return list.length;
    },
    [fail]
  );

  const updateBirthday: Store['updateBirthday'] = useCallback(
    async (id, patch) => {
      setBirthdays((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
      const { error } = await getSupabase().from(BDAYS).update(patch).eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const deleteBirthday: Store['deleteBirthday'] = useCallback(
    async (id) => {
      setBirthdays((prev) => prev.filter((b) => b.id !== id));
      const { error } = await getSupabase().from(BDAYS).delete().eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const value: Store = {
    items,
    index,
    birthdays,
    loading,
    error,
    notify,
    addItem,
    importRows,
    updateItem,
    toggleDone,
    restoreDone,
    deleteItem,
    schedule,
    move,
    addBirthdays,
    updateBirthday,
    deleteBirthday,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-text">{toast.message}</span>
          {toast.undo && (
            <button
              className="primary"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return s;
}
