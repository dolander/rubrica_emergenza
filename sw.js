// Service worker: rete prima (così i dati aggiornati arrivano subito),
// cache come riserva quando la rete manca o è troppo lenta.
// Per forzare l'aggiornamento di tutti i telefoni, cambia il numero di versione.
const CACHE = 'rubrica-mugello-v8';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    new Promise((resolve) => {
      let answered = false;
      const fromCache = () =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'));

      // se la rete non risponde entro 3 secondi, usa la copia salvata
      const timer = setTimeout(() => {
        fromCache().then((hit) => { if (hit && !answered) { answered = true; resolve(hit); } });
      }, 3000);

      fetch(req)
        .then((res) => {
          clearTimeout(timer);
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          if (!answered) { answered = true; resolve(res); }
        })
        .catch(() => {
          clearTimeout(timer);
          fromCache().then((hit) => {
            if (!answered) { answered = true; resolve(hit || Response.error()); }
          });
        });
    })
  );
});
