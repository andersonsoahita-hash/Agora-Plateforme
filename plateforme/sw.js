/* Agora — worker minimal : rend la page installable. Il ne garde rien en cache : la page est toujours celle du serveur. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
