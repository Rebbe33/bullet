'use client';

import type { ExtEntry } from '@/lib/external';

/** Éléments venant des autres applis (lecture seule) : on les voit, on ne les coche pas ici */
export function ExtList({ entries }: { entries: ExtEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="ext-list">
      {entries.map((e) => {
        const body = (
          <>
            <span className="ext-main">
              <span className="ext-icon">{e.icon}</span>
              <span className="ext-title">{e.title}</span>
              {e.done && <span className="ext-ok">✓ validé</span>}
              {e.late && <span className="ext-late">{e.late}</span>}
            </span>
            {e.detail?.map((d, i) => (
              <span key={i} className="ext-detail">
                {d}
              </span>
            ))}
          </>
        );
        return (
          <li key={e.key} className={`ext ext-${e.kind}` + (e.done ? ' is-done' : '')}>
            {e.url ? (
              <a href={e.url} target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
