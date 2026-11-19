'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { depthOf, parseList } from '@/lib/importer';
import type { Item } from '@/lib/types';

const EXAMPLE = `Potager
  Préparer le terrain
    Désherber
    Bêcher
  Acheter les graines
    [ ] Tomates
    [x] Carottes
Autre objectif`;

export function ImportPanel({ onClose }: { onClose: () => void }) {
  const { index, importRows } = useStore();
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rows = useMemo(() => parseList(text), [text]);

  // liste à plat de tous les éléments, pour choisir où importer
  const options = useMemo(() => {
    const out: { item: Item; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const it of index.kids.get(parent) ?? []) {
        out.push({ item: it, depth });
        walk(it.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [index]);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    const n = await importRows(target || null, rows);
    setBusy(false);
    if (n > 0) {
      setText('');
      setMsg(`${n} élément${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''} ✓`);
    }
  };

  return (
    <section className="card import">
      <div className="import-head">
        <h3>Importer une liste</h3>
        <button onClick={onClose}>Fermer</button>
      </div>
      <p className="muted small">
        Colle ta liste : une ligne = une tâche, et l'indentation (espaces ou tabulation) crée les
        sous-tâches. Les puces (-, *, 1.) sont ignorées, et [x] marque une tâche déjà faite.
      </p>

      <label className="field">
        Où l'ajouter ?
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Nouveaux objectifs (à la racine)</option>
          {options.map(({ item, depth }) => (
            <option key={item.id} value={item.id}>
              {'— '.repeat(depth)}
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <textarea
        className="mono"
        rows={10}
        value={text}
        placeholder={EXAMPLE}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="import-file">
        <label className="muted small">
          ou charge un fichier .txt / .md :{' '}
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="preview">
          <strong>Aperçu ({rows.length})</strong>
          <ul>
            {rows.slice(0, 60).map((r, i) => (
              <li key={i} style={{ paddingLeft: depthOf(rows, i) * 16 }}>
                {r.done ? '☑' : '☐'} {r.title}
              </li>
            ))}
            {rows.length > 60 && <li className="muted">… et {rows.length - 60} de plus</li>}
          </ul>
        </div>
      )}

      <div className="edit-actions">
        <button className="primary" disabled={rows.length === 0 || busy} onClick={run}>
          {busy ? 'Import…' : `Importer ${rows.length || ''}`.trim()}
        </button>
        {msg && <span className="ok">{msg}</span>}
      </div>
    </section>
  );
}
