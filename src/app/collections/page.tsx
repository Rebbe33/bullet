'use client';

import { useState } from 'react';
import { CollectionsProvider, useCollections } from '@/lib/collections';
import { useStore } from '@/lib/store';
import { todayISO } from '@/lib/dates';
import { PASTELS } from '@/lib/moods';
import { QuickAdd } from '@/components/QuickAdd';
import type { Collection, CollectionItem } from '@/lib/types';

function CollectionForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Collection;
  onSave: (c: { title: string; emoji: string | null; color: string }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');
  const [color, setColor] = useState(initial?.color ?? PASTELS[2]);
  return (
    <form
      className="habit-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) void onSave({ title: title.trim(), emoji: emoji.trim() || null, color });
      }}
    >
      <div className="hf-row">
        <input className="hf-emoji" value={emoji} maxLength={4} placeholder="📚" aria-label="Emoji" onChange={(e) => setEmoji(e.target.value)} />
        <input className="hf-name" value={title} autoFocus placeholder="Nom (ex. Livres à lire)" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="swatches" role="group" aria-label="Couleur">
        {PASTELS.map((c) => (
          <button key={c} type="button" className={'swatch' + (color === c ? ' on' : '')} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />
        ))}
      </div>
      <div className="edit-actions">
        <button type="submit" className="primary" disabled={!title.trim()}>
          Enregistrer
        </button>
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function Entry({ e, dump }: { e: CollectionItem; dump: boolean }) {
  const c = useCollections();
  const { addItem } = useStore();
  const [note, setNote] = useState(false);

  return (
    <li className={'entry' + (e.done ? ' is-done' : '')}>
      <div className="entry-main">
        {!dump && (
          <input type="checkbox" checked={e.done} onChange={() => void c.updateEntry(e.id, { done: !e.done })} />
        )}
        <span className="entry-text">{e.text}</span>
        {!dump && (
          <button className="icon" title="Note" onClick={() => setNote((n) => !n)}>
            {e.note ? '📝' : '✎'}
          </button>
        )}
        <button className="icon" title="Supprimer" onClick={() => void c.deleteEntry(e.id)}>
          ✕
        </button>
      </div>
      {dump && (
        <div className="review-actions">
          <button
            onClick={() => {
              void addItem(null, e.text);
              void c.deleteEntry(e.id);
            }}
          >
            → Objectif
          </button>
          <button
            onClick={() => {
              void addItem(null, e.text, { type: 'day', date: todayISO() });
              void c.deleteEntry(e.id);
            }}
          >
            → Aujourd'hui
          </button>
        </div>
      )}
      {!dump && (note || e.note) && (
        <input
          className="entry-note"
          defaultValue={e.note ?? ''}
          placeholder="Note (auteur, avis, lien…)"
          autoFocus={note && !e.note}
          onBlur={(ev) => {
            const v = ev.target.value.trim() || null;
            if (v !== e.note) void c.updateEntry(e.id, { note: v });
            if (!v) setNote(false);
          }}
        />
      )}
    </li>
  );
}

function CollectionsInner() {
  const c = useCollections();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hideDone, setHideDone] = useState(false);

  if (c.loading) return <p className="muted">Chargement…</p>;
  const current = c.collections.find((x) => x.id === openId) ?? null;

  if (current) {
    const dump = current.kind === 'dump';
    const entries = c.items.filter((i) => i.collection_id === current.id);
    const doneN = entries.filter((i) => i.done).length;
    const shown = hideDone ? entries.filter((i) => !i.done) : entries;
    return (
      <>
        <div className="page-head">
          <button onClick={() => { setOpenId(null); setEditing(false); }}>‹ Collections</button>
          {!dump && <button onClick={() => setEditing((e) => !e)}>✎ Modifier</button>}
        </div>
        {editing && !dump ? (
          <>
            <CollectionForm
              initial={current}
              onCancel={() => setEditing(false)}
              onSave={async (v) => {
                await c.updateCollection(current.id, v);
                setEditing(false);
              }}
            />
            <button
              className="danger"
              onClick={() => {
                if (window.confirm(`Supprimer « ${current.title} » et tout son contenu ?`)) {
                  void c.deleteCollection(current.id);
                  setOpenId(null);
                  setEditing(false);
                }
              }}
            >
              🗑 Supprimer cette collection
            </button>
          </>
        ) : (
          <h1 className="coll-title" style={{ borderColor: current.color }}>
            {current.emoji} {current.title}
          </h1>
        )}
        {dump && (
          <p className="muted small">
            Vide ta tête ici, en vrac. Plus tard, transforme chaque ligne en objectif ou en tâche du jour.
          </p>
        )}
        <QuickAdd
          placeholder={dump ? 'Ce qui te passe par la tête (Entrée)' : 'Ajouter (Entrée)'}
          onAdd={(t) => c.addEntry(current.id, t)}
        />
        {!dump && entries.length > 0 && (
          <label className="check">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Masquer les cochés ({doneN}/{entries.length})
          </label>
        )}
        <ul className="entries">
          {shown.map((e) => (
            <Entry key={e.id} e={e} dump={dump} />
          ))}
        </ul>
        {entries.length === 0 && <p className="muted">Rien pour l'instant.</p>}
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Collections</h1>
        {!creating && <button onClick={() => setCreating(true)}>＋ Nouvelle collection</button>}
      </div>
      {creating && (
        <CollectionForm
          onCancel={() => setCreating(false)}
          onSave={async (v) => {
            const id = await c.addCollection(v);
            setCreating(false);
            if (id) setOpenId(id);
          }}
        />
      )}
      {c.error && <p className="error">⚠️ {c.error}</p>}
      <div className="coll-grid">
        {c.collections.map((col) => {
          const entries = c.items.filter((i) => i.collection_id === col.id);
          const doneN = entries.filter((i) => i.done).length;
          return (
            <button key={col.id} className="coll-card" style={{ background: col.color }} onClick={() => setOpenId(col.id)}>
              <span className="coll-emoji">{col.emoji ?? '📒'}</span>
              <strong>{col.title}</strong>
              <small>
                {col.kind === 'dump' ? `${entries.length} en vrac` : `${doneN}/${entries.length}`}
              </small>
            </button>
          );
        })}
      </div>
      {c.collections.length <= 1 && (
        <p className="muted">
          Crée tes collections : livres à lire, films, idées de dessins, recettes testées, cadeaux à offrir…
        </p>
      )}
    </>
  );
}

export default function CollectionsPage() {
  return (
    <CollectionsProvider>
      <CollectionsInner />
    </CollectionsProvider>
  );
}
