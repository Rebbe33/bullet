'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { MONTH_MOTIFS } from '@/lib/moods';

const MORE = [
  { href: '/annee', label: '🎨 Année' },
  { href: '/collections', label: '📚 Collections' },
  { href: '/anniversaires', label: '🎂 Anniversaires' },
  { href: '/revue', label: '📋 Revue de la semaine' },
  { href: '/reglages', label: '⚙ Réglages' },
];

export function Nav() {
  const path = usePathname();
  const { error } = useStore();
  const [more, setMore] = useState(false);
  const link = (href: string, label: React.ReactNode) => (
    <Link href={href} className={path.startsWith(href) ? 'active' : ''}>
      {label}
    </Link>
  );
  const moreActive = MORE.some((m) => path.startsWith(m.href));

  return (
    <header className="top">
      <div className="top-in">
        <strong className="brand">{MONTH_MOTIFS[new Date().getMonth()]} Bullet</strong>
        <nav>
          {link('/agenda', 'Agenda')}
          {link('/objectifs', 'Objectifs')}
          {link('/suivi', 'Suivi')}
          <span className="more-wrap">
            <button className={'more-btn' + (moreActive ? ' active' : '')} onClick={() => setMore((m) => !m)} aria-label="Plus">
              ⋯
            </button>
            {more && (
              <>
                <div className="backdrop" onClick={() => setMore(false)} />
                <div className="menu more-menu" onClick={() => setMore(false)}>
                  {MORE.map((m) => (
                    <Link key={m.href} href={m.href} className={path.startsWith(m.href) ? 'active' : ''}>
                      {m.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </span>
        </nav>
      </div>
      {error && <div className="error">⚠️ {error}</div>}
    </header>
  );
}
