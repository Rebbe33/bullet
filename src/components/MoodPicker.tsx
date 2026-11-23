'use client';

import { MOODS } from '@/lib/moods';

/** 5 humeurs en pastilles colorées ; re-toucher l'humeur choisie l'efface */
export function MoodPicker({ value, onChange }: { value: number | null; onChange: (m: number | null) => void }) {
  return (
    <div className="moods" role="group" aria-label="Humeur">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          className={'mood' + (value === m.value ? ' on' : '')}
          style={{ background: m.color }}
          title={m.label}
          aria-label={m.label}
          aria-pressed={value === m.value}
          onClick={() => onChange(value === m.value ? null : m.value)}
        >
          <span className="mood-emoji">{m.emoji}</span>
          <span className="mood-label">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
