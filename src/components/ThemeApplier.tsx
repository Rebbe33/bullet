'use client';

import { useEffect } from 'react';

export type ThemeName = 'pastel' | 'classique';

export const getTheme = (): ThemeName => {
  try {
    return localStorage.getItem('bullet_theme') === 'classique' ? 'classique' : 'pastel';
  } catch {
    return 'pastel';
  }
};

export function applyTheme(t: ThemeName) {
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.month = String(new Date().getMonth() + 1);
}

/** Applique le thème choisi et la couleur du mois (le script du <head> évite le clignotement) */
export function ThemeApplier() {
  useEffect(() => applyTheme(getTheme()), []);
  return null;
}
