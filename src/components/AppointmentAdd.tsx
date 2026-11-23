'use client';

import { useState } from 'react';

interface Props {
  onAdd: (
    title: string,
    time: string | null,
    extra: { end_time: string | null; location: string | null }
  ) => void | Promise<void>;
}

/** Petit formulaire « ＋ RDV » : titre + heure de début / fin + lieu (facultatifs) */
export function AppointmentAdd({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [end, setEnd] = useState('');
  const [place, setPlace] = useState('');

  if (!open) {
    return (
      <button className="appt-add" onClick={() => setOpen(true)}>
        ＋ RDV
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    setTitle('');
    setTime('');
    setEnd('');
    setPlace('');
  };

  return (
    <form
      className="appt-form"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        void onAdd(t, time || null, {
          end_time: time && end ? end : null,
          location: place.trim() || null,
        });
        close();
      }}
    >
      <input
        className="appt-title"
        value={title}
        autoFocus
        placeholder="RDV (ex. dentiste)"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      />
      <input
        type="time"
        className="appt-time"
        value={time}
        aria-label="Heure du rendez-vous"
        onChange={(e) => setTime(e.target.value)}
      />
      {time && (
        <input
          type="time"
          className="appt-time"
          value={end}
          min={time}
          aria-label="Heure de fin"
          title="Heure de fin (facultative)"
          onChange={(e) => setEnd(e.target.value)}
        />
      )}
      <input
        className="appt-place"
        value={place}
        placeholder="📍 Lieu (facultatif)"
        onChange={(e) => setPlace(e.target.value)}
      />
      <button type="submit" className="validate" disabled={!title.trim()} aria-label="Valider">
        ✓
      </button>
      <button type="button" onClick={close} aria-label="Annuler">
        ✕
      </button>
    </form>
  );
}
