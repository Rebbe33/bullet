import type { Item } from './types';

export interface Index {
  byId: Map<string, Item>;
  /** enfants triés ; la clé `null` donne les éléments racines (objectifs) */
  kids: Map<string | null, Item[]>;
}

export function buildIndex(items: Item[]): Index {
  const byId = new Map<string, Item>();
  const kids = new Map<string | null, Item[]>();
  for (const it of items) {
    byId.set(it.id, it);
    const list = kids.get(it.parent_id) ?? [];
    list.push(it);
    kids.set(it.parent_id, list);
  }
  for (const list of kids.values()) {
    list.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  }
  return { byId, kids };
}

export function descendantIds(idx: Index, id: string): string[] {
  const out: string[] = [];
  const stack = [...(idx.kids.get(id) ?? [])];
  while (stack.length) {
    const it = stack.pop()!;
    out.push(it.id);
    stack.push(...(idx.kids.get(it.id) ?? []));
  }
  return out;
}

/** Feuilles du sous-arbre (l'élément lui-même s'il n'a pas d'enfants) */
export function leaves(idx: Index, id: string): Item[] {
  const kids = idx.kids.get(id) ?? [];
  if (kids.length === 0) {
    const self = idx.byId.get(id);
    return self ? [self] : [];
  }
  return kids.flatMap((k) => leaves(idx, k.id));
}

export function progress(idx: Index, id: string) {
  const ls = leaves(idx, id);
  const done = ls.filter((l) => l.done).length;
  const total = ls.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Un parent est "fait" quand toutes ses feuilles le sont */
export function isDone(idx: Index, item: Item): boolean {
  const hasKids = (idx.kids.get(item.id)?.length ?? 0) > 0;
  if (!hasKids) return item.done;
  const p = progress(idx, item.id);
  return p.total > 0 && p.done === p.total;
}

/** Titres des ancêtres, du plus haut au plus proche */
export function pathTitles(idx: Index, id: string): string[] {
  const out: string[] = [];
  let cur = idx.byId.get(id)?.parent_id ?? null;
  while (cur) {
    const p = idx.byId.get(cur);
    if (!p) break;
    out.unshift(p.title);
    cur = p.parent_id;
  }
  return out;
}
