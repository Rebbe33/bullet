'use client';

import { useState } from 'react';

interface Props {
  placeholder: string;
  onAdd: (title: string) => void | Promise<void>;
  autoFocus?: boolean;
  /** appelé quand on quitte le champ vide ou qu'on appuie sur Échap */
  onDone?: () => void;
}

export function QuickAdd({ placeholder, onAdd, autoFocus, onDone }: Props) {
  const [v, setV] = useState('');
  return (
    <form
      className="quick"
      onSubmit={(e) => {
        e.preventDefault();
        const t = v.trim();
        if (!t) return;
        setV('');
        void onAdd(t);
      }}
    >
      <input
        value={v}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone?.();
        }}
        onBlur={() => {
          if (!v.trim()) onDone?.();
        }}
      />
    </form>
  );
}
