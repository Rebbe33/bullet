'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { todayISO } from '@/lib/dates';
import { MONTHS, ageOn, daysUntil, nextBirthday, parseBirthdays } from '@/lib/birthdays';
import { BirthdayForm } from '@/components/BirthdayForm';

export default function AnniversairesPage() {
  const { birthdays, loading, addBirthdays, updateBirthday, deleteBirthday } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const parsed = useMemo(() => parseBirthdays(text), [text]);

  if (loading) return <p className="muted">Chargement…</p>;

  const today = todayISO();
  const rows = birthdays
    .map((b) => {
      const next = nextBirthday(b, today);
      return { b, next, in: daysUntil(today, next) };
    })
    .sort((x, y) => x.in - y.in || x.b.name.localeCompare(y.b.name));

  const when = (n: number) => (n === 0 ? "Aujourd'hui !" : n === 1 ? 'Demain' : `Dans ${n} jours`);

  return (
    <>
      <div className="page-head">
        <h1>Anniversaires</h1>
        {!importing && <button onClick={() => setImporting(true)}>⬆ Importer une liste</button>}
      </div>

      <section className="card">
        <h3>Ajouter un anniversaire</h3>
        <BirthdayForm onSubmit={(b) => void addBirthdays([b])} />
      </section>

      {importing && (
        <section className="card import">
          <div className="import-head">
            <h3>Importer une liste</h3>
            <button onClick={() => setImporting(false)}>Fermer</button>
          </div>
          <p className="muted small">
            Une ligne par personne : le prénom, puis la date en jour/mois (année facultative).
            Exemples : « Maman 12/03/1960 », « Julie, 03/07 », « Paul - 25.12.85 ».
          </p>
          <textarea
            className="mono"
            rows={8}
            value={text}
            placeholder={'Maman 12/03/1960\nJulie 03/07\nPaul 25/12/1985'}
            onChange={(e) => setText(e.target.value)}
          />
          {parsed.rows.length > 0 && (
            <div className="preview">
              <strong>Aperçu ({parsed.rows.length})</strong>
              <ul>
                {parsed.rows.slice(0, 60).map((r, i) => (
                  <li key={i}>
                    🎂 {r.name} · {r.day} {MONTHS[r.month - 1].toLowerCase()}
                    {r.birth_year ? ` ${r.birth_year}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parsed.invalid.length > 0 && (
            <p className="bf-err">
              {parsed.invalid.length} ligne(s) non comprise(s) : {parsed.invalid.slice(0, 3).join(' | ')}
              {parsed.invalid.length > 3 ? '…' : ''}
            </p>
          )}
          <div className="edit-actions">
            <button
              className="primary"
              disabled={parsed.rows.length === 0}
              onClick={async () => {
                const n = await addBirthdays(parsed.rows);
                if (n > 0) {
                  setText('');
                  setMsg(`${n} anniversaire${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''} ✓`);
                }
              }}
            >
              Importer {parsed.rows.length || ''}
            </button>
            {msg && <span className="ok">{msg}</span>}
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <p className="muted">
          Aucun anniversaire pour l'instant. Ajoute-en : ils apparaîtront tout seuls dans l'agenda,
          chaque année, en rose 🎂
        </p>
      ) : (
        <ul className="bdays-list">
          {rows.map(({ b, next, in: n }) =>
            editing === b.id ? (
              <li key={b.id} className="card">
                <BirthdayForm
                  initial={b}
                  onCancel={() => setEditing(null)}
                  onSubmit={(nb) => {
                    void updateBirthday(b.id, nb);
                    setEditing(null);
                  }}
                />
              </li>
            ) : (
              <li key={b.id} className={'bday-row' + (n === 0 ? ' today' : '')}>
                <span className="bday-ico">🎂</span>
                <div className="bday-main">
                  <span className="bday-name">{b.name}</span>
                  <span className="bday-sub">
                    {b.day} {MONTHS[b.month - 1].toLowerCase()}
                    {ageOn(b, next) !== null && ` · ${ageOn(b, next)} ans`}
                  </span>
                </div>
                <span className="bday-when">{when(n)}</span>
                <button className="icon" title="Modifier" onClick={() => setEditing(b.id)}>
                  ✎
                </button>
                <button
                  className="icon danger"
                  title="Supprimer"
                  onClick={() => {
                    if (window.confirm(`Supprimer l'anniversaire de ${b.name} ?`))
                      void deleteBirthday(b.id);
                  }}
                >
                  🗑
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </>
  );
}
