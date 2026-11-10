/* Agora — fonctionne sans réseau : réseau d'abord (toujours la dernière version), cache en secours. Le serveur (script.google.com) n'est jamais mis en cache. */
const CACHE = 'agora-pl-1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('agora-pl-') === 0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function enCache(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const copie = res.clone(); caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {}); }
  return res;
}
function avecDelai(req, ms) {
  return new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('delai')), ms); fetch(req).then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); }); });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'script.google.com' || url.hostname.endsWith('googleusercontent.com')) return;
  const ici = url.origin === location.origin;
  const police = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!ici && !police) return;
  if (police) { /* polices : cache d'abord, mise à jour en arrière-plan */
    e.respondWith(caches.match(req).then(r => { const net = fetch(req).then(x => enCache(req, x)).catch(() => r); return r || net; }));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(avecDelai(req, 4000).then(r => enCache('index.html', r)).catch(() => caches.match('index.html', { ignoreSearch: true }).then(r => r || caches.match('./', { ignoreSearch: true })).then(r => r || new Response('Hors ligne — ouvre Agora une première fois avec du réseau.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
    return;
  }
  e.respondWith(avecDelai(req, 4000).then(r => enCache(req, r)).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || Response.error())));
});
