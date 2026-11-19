export interface ParsedRow {
  title: string;
  done: boolean;
  /** index (dans la liste parsée) du parent, ou null = niveau de départ */
  parentIdx: number | null;
}

/**
 * Transforme un texte en liste hiérarchique.
 * - une ligne = un élément
 * - l'indentation (espaces ou tabulations) donne le niveau
 * - les puces (-, *, +, •, 1., 1)) sont retirées
 * - [ ] / [x] au début de ligne = à faire / déjà fait
 */
export function parseList(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const stack: { indent: number; idx: number }[] = [];

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;

    const lead = raw.match(/^[ \t]*/)![0];
    const indent = [...lead].reduce((n, c) => n + (c === '\t' ? 4 : 1), 0);

    let line = raw.trim().replace(/^([-*+•–]|\d+[.)])\s+/, '');
    let done = false;
    const cb = line.match(/^\[([ xX])\]\s*/);
    if (cb) {
      done = cb[1] !== ' ';
      line = line.slice(cb[0].length);
    }
    const title = line.trim();
    if (!title) continue;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    rows.push({ title, done, parentIdx: stack.length ? stack[stack.length - 1].idx : null });
    stack.push({ indent, idx: rows.length - 1 });
  }

  return rows;
}

export function depthOf(rows: ParsedRow[], i: number): number {
  let d = 0;
  let p = rows[i].parentIdx;
  while (p !== null) {
    d++;
    p = rows[p].parentIdx;
  }
  return d;
}
