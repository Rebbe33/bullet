'use client';

import { useState } from 'react';
import type { Habit } from '@/lib/types';
import { PASTELS } from '@/lib/moods';

type Draft = Pick<Habit, 'name' | 'emoji' | 'color' | 'kind' | 'unit' | 'goal_per_week'>;

export function HabitForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Habit;
  onSave: (h: Draft) => void | Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '');
  const [color, setColor] = useState(initial?.color ?? PASTELS[0]);
  const [kind, setKind] = useState<Habit['kind']>(initial?.kind ?? 'check');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [goal, setGoal] = useState(initial?.goal_per_week ? String(initial.goal_per_week) : '');

  return (
    <form
      className="habit-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void onSave({
          name: name.trim(),
          emoji: emoji.trim() || null,
          color,
          kind,
          unit: kind === 'number' ? unit.trim() || null : null,
          goal_per_week: kind === 'check' && goal ? Number(goal) : null,
        });
      }}
    >
      <div className="hf-row">
        <input
          className="hf-emoji"
          value={emoji}
          maxLength={4}
          placeholder="🧘"
          aria-label="Emoji"
          onChange={(e) => setEmoji(e.target.value)}
        />
        <input
          className="hf-name"
          value={name}
          autoFocus
          placeholder="Nom (ex. Yoga)"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="hf-row">
        <select value={kind} onChange={(e) => setKind(e.target.value as Habit['kind'])}>
          <option value="check">Case à cocher</option>
          <option value="number">Une valeur (eau, sommeil…)</option>
        </select>
        {kind === 'number' ? (
          <input
            value={unit}
            placeholder="Unité (h, verres…)"
            onChange={(e) => setUnit(e.target.value)}
          />
        ) : (
          <select value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Objectif par semaine">
            <option value="">Sans objectif</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                Objectif : {n}×/semaine
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="swatches" role="group" aria-label="Couleur">
        {PASTELS.map((c) => (
          <button
            key={c}
            type="button"
            className={'swatch' + (color === c ? ' on' : '')}
            style={{ background: c }}
            aria-label={c}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="edit-actions">
        <button type="submit" className="primary" disabled={!name.trim()}>
          Enregistrer
        </button>
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}>
            🗑 Supprimer
          </button>
        )}
      </div>
    </form>
  );
}
