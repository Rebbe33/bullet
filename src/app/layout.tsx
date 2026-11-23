import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { Nav } from '@/components/Nav';
import { RegisterSW } from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'Bullet',
  description: 'Bullet journal : objectifs, tâches, agenda et anniversaires',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Bullet', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#c2562f',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthGate>
          <Nav />
          <main className="wrap">{children}</main>
        </AuthGate>
        <RegisterSW />
      </body>
    </html>
  );
}
