// Service worker minimal : sert uniquement à rendre l'appli installable.
// Il ne met RIEN en cache : les données viennent toujours du réseau (Supabase),
// donc aucun risque de voir une ancienne version après une mise à jour.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
