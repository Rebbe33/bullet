import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { StoreProvider } from '@/lib/store';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Bullet',
  description: 'Bullet journal : objectifs, tâches et agenda',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <StoreProvider>
          <Nav />
          <main className="wrap">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
