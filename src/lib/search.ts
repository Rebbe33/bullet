import type { Item } from './types';
import type { Index } from './tree';

/** Minuscules sans accents, caractère par caractère (garde la même longueur que le texte d'origine) */
export const fold = (s: string) =>
  s
    .split('')
    .map((c) => c.normalize('NFD').charAt(0).toLowerCase().charAt(0) || c)
    .join('');

export interface SearchFilter {
  /** éléments dont le titre ou les notes contiennent la recherche */
  matched: Set<string>;
  /** éléments à afficher : les résultats + leurs ancêtres */
  visible: Set<string>;
  /** ancêtres des résultats : dépliés automatiquement */
  forcedOpen: Set<string>;
}

export function buildFilter(index: Index, items: Item[], query: string): SearchFilter | null {
  const fq = fold(query.trim());
  if (!fq) return null;
  const matched = new Set<string>();
  const visible = new Set<string>();
  const forcedOpen = new Set<string>();
  for (const it of items) {
    if (!fold(`${it.title} ${it.notes ?? ''}`).includes(fq)) continue;
    matched.add(it.id);
    visible.add(it.id);
    let cur = it.parent_id;
    while (cur && !forcedOpen.has(cur)) {
      forcedOpen.add(cur);
      visible.add(cur);
      cur = index.byId.get(cur)?.parent_id ?? null;
    }
  }
  return { matched, visible, forcedOpen };
}
