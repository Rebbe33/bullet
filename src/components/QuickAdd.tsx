'use client';

import { useRef, useState } from 'react';

interface Props {
  placeholder: string;
  onAdd: (title: string) => void | Promise<void>;
  autoFocus?: boolean;
  /** appelé quand on quitte le champ vide ou qu'on appuie sur Échap */
  onDone?: () => void;
}

export function QuickAdd({ placeholder, onAdd, autoFocus, onDone }: Props) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const submit = () => {
    const t = v.trim();
    if (!t) return;
    setV('');
    void onAdd(t);
    ref.current?.focus(); // on reste dans le champ pour enchaîner les ajouts
  };

  return (
    <form
      className="quick"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={ref}
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
      <button
        type="submit"
        className="validate"
        disabled={!v.trim()}
        aria-label="Valider"
        title="Valider"
        // évite que le clavier se ferme quand on tape sur ✓
        onMouseDown={(e) => e.preventDefault()}
      >
        ✓
      </button>
    </form>
  );
}
