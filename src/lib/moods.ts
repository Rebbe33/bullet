export const MOODS: { value: number; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: '😄', label: 'Super', color: '#a8dcb8' },
  { value: 2, emoji: '🙂', label: 'Bien', color: '#d3eaa9' },
  { value: 3, emoji: '😐', label: 'Moyen', color: '#fae9a6' },
  { value: 4, emoji: '😕', label: 'Bof', color: '#f8c8a6' },
  { value: 5, emoji: '😞', label: 'Dur', color: '#ebabc4' },
];

export const moodColor = (m: number | null | undefined) =>
  MOODS.find((x) => x.value === m)?.color ?? null;

/** Couleurs douces pour les habitudes et les collections */
export const PASTELS = [
  '#a8dcb8', // menthe
  '#b9d8f0', // ciel
  '#cdb9ea', // lavande
  '#f4c2d7', // rose poudré
  '#f9d9a8', // abricot
  '#f6eba0', // beurre
  '#f2b8a8', // pêche
  '#bfe3df', // eau
];

export const STICKERS = ['⭐', '🌿', '🌸', '🐶', '🐱', '☕', '🎨', '📚', '🧘', '💪', '✈️', '🎁', '💡', '❤️', '🛒', '🧹'];

export const MONTH_MOTIFS = ['❄️', '💌', '🌱', '🌸', '🌼', '☀️', '🍉', '🌻', '🍂', '🎃', '🍁', '⭐'];
export const MOODS: { value: number; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: '😄', label: 'Super', color: '#a8dcb8' },
  { value: 2, emoji: '🙂', label: 'Bien', color: '#d3eaa9' },
  { value: 3, emoji: '😐', label: 'Moyen', color: '#fae9a6' },
  { value: 4, emoji: '😕', label: 'Bof', color: '#f8c8a6' },
  { value: 5, emoji: '😞', label: 'Dur', color: '#ebabc4' },
];

export const moodColor = (m: number | null | undefined) =>
  MOODS.find((x) => x.value === m)?.color ?? null;

/** Couleurs douces pour les habitudes et les collections */
export const PASTELS = [
  '#a8dcb8', // menthe
  '#b9d8f0', // ciel
  '#cdb9ea', // lavande
  '#f4c2d7', // rose poudré
  '#f9d9a8', // abricot
  '#f6eba0', // beurre
  '#f2b8a8', // pêche
  '#bfe3df', // eau
];

export const STICKERS = ['⭐', '🌿', '🌸', '🐶', '🐱', '☕', '🎨', '📚', '🧘', '💪', '✈️', '🎁', '💡', '❤️', '🛒', '🧹'];

export const MONTH_MOTIFS = ['❄️', '💌', '🌱', '🌸', '🌼', '☀️', '🍉', '🌻', '🍂', '🎃', '🍁', '⭐'];
