// ═══════════════════════════════════════════════════════════════════
// 🔧 Sea POS - Service Worker
// ═══════════════════════════════════════════════════════════════════
// يتيح للتطبيق العمل offline وكـ PWA على الهاتف

const CACHE_NAME = 'sea-pos-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
];

// ═══ تثبيت SW وحفظ الملفات الأساسية ═══
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.log('Cache failed:', err))
  );
});

// ═══ تنشيط SW وحذف الـ caches القديمة ═══
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ═══ استراتيجية Cache: Network First للـ API، Cache First للـ assets ═══
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // تجاهل الـ WebSocket
  if (request.url.includes('ws://') || request.url.includes('wss://')) {
    return;
  }

  // تجاهل الـ API calls (لـ sync)
  if (request.url.includes('/api/')) {
    return;
  }

  // استراتيجية: Cache First مع Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // حفظ الـ response في cache لو نجح
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // لو فشل الإنترنت، ارجع لـ index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ═══ استقبال رسائل من التطبيق ═══
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
