// ═══════════════════════════════════════════════════════════════════
// 🔧 Sea POS - Service Worker
// ═══════════════════════════════════════════════════════════════════
// Strategia:
//   - HTML / JS / CSS  → Network First (cache di fallback)
//        così ogni telefono installato riceve subito l'ultima versione
//   - Icone / font     → Cache First (non cambiano mai)
//   - Richieste /api/  → pass-through (niente cache)
// ═══════════════════════════════════════════════════════════════════

const VERSION = 'v2';
const CACHE_NAME = `sea-pos-${VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// ═══ install: salva i file base ═══
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.log('Cache failed:', err))
  );
});

// ═══ activate: elimina le cache vecchie ═══
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ═══ fetch ═══
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  // WebSocket → ignorato
  if (request.url.includes('ws://') || request.url.includes('wss://')) return;

  // API → ignorato
  if (request.url.includes('/api/')) return;

  const url = new URL(request.url);

  // Solo risorse dello stesso dominio
  if (url.origin !== self.location.origin) return;

  const isAsset = /\.(js|css|html|json|svg|png|jpg|jpeg|webp|woff2?)$/i.test(
    url.pathname
  );
  const isNavigate = request.mode === 'navigate';

  // ── Network First per app shell e codice ──
  if (isAsset || isNavigate) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (isNavigate) return caches.match('/index.html');
            return Response.error();
          })
        )
    );
    return;
  }

  // ── Cache First per il resto ──
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});

// ═══ messaggi dall'app ═══
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
