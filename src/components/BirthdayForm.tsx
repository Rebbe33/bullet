'use client';

import { useState } from 'react';
import type { NewBirthday } from '@/lib/types';
import { MONTHS, maxDay } from '@/lib/birthdays';

interface Props {
  initial?: NewBirthday;
  onSubmit: (b: NewBirthday) => void | Promise<void>;
  onCancel?: () => void;
}

/** Formulaire d'ajout / de modification d'un anniversaire */
export function BirthdayForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [day, setDay] = useState(initial ? String(initial.day) : '');
  const [month, setMonth] = useState(initial ? String(initial.month) : '');
  const [year, setYear] = useState(initial?.birth_year ? String(initial.birth_year) : '');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = Number(day);
    const m = Number(month);
    const y = year.trim() ? Number(year) : null;
    if (!name.trim()) return setErr('Il manque le prénom');
    if (!m) return setErr('Choisis le mois');
    if (!d || d < 1 || d > maxDay(m)) return setErr('Jour invalide pour ce mois');
    if (y !== null && (!Number.isInteger(y) || y < 1900 || y > 2100)) return setErr('Année invalide');
    setErr(null);
    void onSubmit({ name: name.trim(), month: m, day: d, birth_year: y });
    if (!initial) {
      setName('');
      setDay('');
      setMonth('');
      setYear('');
    }
  };

  return (
    <form className="bform" onSubmit={submit}>
      <input
        className="bf-name"
        value={name}
        placeholder="Prénom"
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="bf-day"
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        placeholder="Jour"
        value={day}
        onChange={(e) => setDay(e.target.value)}
      />
      <select className="bf-month" value={month} onChange={(e) => setMonth(e.target.value)}>
        <option value="">Mois</option>
        {MONTHS.map((n, i) => (
          <option key={n} value={i + 1}>
            {n}
          </option>
        ))}
      </select>
      <input
        className="bf-year"
        type="number"
        inputMode="numeric"
        placeholder="Année (facultatif)"
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <button type="submit" className="validate" aria-label="Valider">
        ✓
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} aria-label="Annuler">
          ✕
        </button>
      )}
      {err && <span className="bf-err">{err}</span>}
    </form>
  );
}
