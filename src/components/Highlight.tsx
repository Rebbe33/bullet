import { fold } from '@/lib/search';

/** Affiche le texte en surlignant la recherche (sans tenir compte des accents ni des majuscules) */
export function Highlight({ text, query }: { text: string; query: string }) {
  const fq = fold(query.trim());
  if (!fq) return <>{text}</>;
  const ft = fold(text);
  const parts: React.ReactNode[] = [];
  let from = 0;
  for (let at = ft.indexOf(fq); at !== -1; at = ft.indexOf(fq, from)) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(<mark key={at}>{text.slice(at, at + fq.length)}</mark>);
    from = at + fq.length;
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}
