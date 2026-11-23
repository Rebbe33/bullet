'use client';

import { useEffect } from 'react';

/** Enregistre le service worker (nécessaire pour pouvoir installer l'appli) */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
