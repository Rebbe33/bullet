'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

export function Nav() {
  const path = usePathname();
  const { error } = useStore();
  const link = (href: string, label: React.ReactNode) => (
    <Link href={href} className={path.startsWith(href) ? 'active' : ''}>
      {label}
    </Link>
  );

  return (
    <header className="top">
      <div className="top-in">
        <strong className="brand">✎ Bullet</strong>
        <nav>
          {link('/agenda', 'Agenda')}
          {link('/objectifs', 'Objectifs')}
          {link(
            '/anniversaires',
            <>
              🎂<span className="nav-long"> Anniversaires</span>
            </>
          )}
          {link('/revue', <span title="Revue de la semaine">📋<span className="nav-long"> Revue</span></span>)}
          {link('/reglages', <span title="Réglages">⚙</span>)}
        </nav>
      </div>
      {error && <div className="error">⚠️ {error}</div>}
    </header>
  );
}
