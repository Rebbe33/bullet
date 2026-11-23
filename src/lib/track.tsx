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
import { useAuth } from '@/components/AuthGate';
import type { DayNote, Habit } from './types';

interface Track {
  loading: boolean;
  error: string | null;
  habits: Habit[]; // non archivées, triées
  /** valeur saisie pour (habitude, jour), ou undefined */
  value: (habitId: string, day: string) => number | undefined;
  days: Map<string, DayNote>;
  addHabit: (h: Omit<Habit, 'id' | 'position' | 'archived'>) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  /** value = null : on efface */
  setValue: (habitId: string, day: string, value: number | null) => Promise<void>;
  toggle: (habitId: string, day: string) => Promise<void>;
  setMood: (day: string, mood: number | null) => Promise<void>;
  setGratitude: (day: string, text: string) => Promise<void>;
}

const Ctx = createContext<Track | null>(null);
const msg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);

async function loadAll<T>(table: string, order: string): Promise<T[]> {
  const sb = getSupabase();
  const all: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .order(order, { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    from += data.length;
  }
  return all;
}

export function TrackProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<string, number>>(new Map());
  const [days, setDays] = useState<Map<string, DayNote>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [h, l, d] = await Promise.all([
        loadAll<Habit>('bullet_habits', 'created_at'),
        loadAll<{ habit_id: string; day: string; value: number }>('bullet_habit_logs', 'day'),
        loadAll<DayNote>('bullet_days', 'day'),
      ]);
      setAllHabits(h);
      setLogs(new Map(l.map((x) => [`${x.habit_id}|${x.day}`, Number(x.value)])));
      setDays(new Map(d.map((x) => [x.day, x])));
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

  const habits = useMemo(
    () => allHabits.filter((h) => !h.archived).sort((a, b) => a.position - b.position),
    [allHabits]
  );

  const fail = useCallback(
    async (e: unknown) => {
      setError(msg(e));
      await reload();
    },
    [reload]
  );

  const addHabit: Track['addHabit'] = useCallback(
    async (h) => {
      const position = allHabits.length ? Math.max(...allHabits.map((x) => x.position)) + 1 : 1;
      const { data, error } = await getSupabase()
        .from('bullet_habits')
        .insert({ ...h, position })
        .select()
        .single();
      if (error) return fail(error);
      setAllHabits((p) => [...p, data as Habit]);
    },
    [allHabits, fail]
  );

  const updateHabit: Track['updateHabit'] = useCallback(
    async (id, patch) => {
      setAllHabits((p) => p.map((h) => (h.id === id ? { ...h, ...patch } : h)));
      const { error } = await getSupabase().from('bullet_habits').update(patch).eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const deleteHabit: Track['deleteHabit'] = useCallback(
    async (id) => {
      setAllHabits((p) => p.filter((h) => h.id !== id));
      const { error } = await getSupabase().from('bullet_habits').delete().eq('id', id);
      if (error) await fail(error);
    },
    [fail]
  );

  const setValue: Track['setValue'] = useCallback(
    async (habitId, day, value) => {
      const key = `${habitId}|${day}`;
      setLogs((p) => {
        const n = new Map(p);
        if (value === null) n.delete(key);
        else n.set(key, value);
        return n;
      });
      const sb = getSupabase();
      const { error } =
        value === null
          ? await sb.from('bullet_habit_logs').delete().eq('habit_id', habitId).eq('day', day)
          : await sb
              .from('bullet_habit_logs')
              .upsert({ habit_id: habitId, day, value }, { onConflict: 'habit_id,day' });
      if (error) await fail(error);
    },
    [fail]
  );

  const toggle: Track['toggle'] = useCallback(
    (habitId, day) => setValue(habitId, day, logs.has(`${habitId}|${day}`) ? null : 1),
    [logs, setValue]
  );

  const saveDay = useCallback(
    async (day: string, patch: Partial<DayNote>) => {
      const prev = days.get(day) ?? { day, mood: null, gratitude: null };
      const next = { ...prev, ...patch };
      setDays((p) => new Map(p).set(day, next));
      const { error } = await getSupabase()
        .from('bullet_days')
        .upsert(
          { user_id: user.id, day, mood: next.mood, gratitude: next.gratitude },
          { onConflict: 'user_id,day' }
        );
      if (error) await fail(error);
    },
    [days, user.id, fail]
  );

  const setMood: Track['setMood'] = useCallback((day, mood) => saveDay(day, { mood }), [saveDay]);
  const setGratitude: Track['setGratitude'] = useCallback(
    (day, text) => saveDay(day, { gratitude: text.trim() || null }),
    [saveDay]
  );

  const value: Track = {
    loading,
    error,
    habits,
    value: (habitId, day) => logs.get(`${habitId}|${day}`),
    days,
    addHabit,
    updateHabit,
    deleteHabit,
    setValue,
    toggle,
    setMood,
    setGratitude,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrack(): Track {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTrack doit être utilisé dans <TrackProvider>');
  return c;
}
