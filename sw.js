const CACHE_NAME = 'cien-2026-v56';

// Only cache truly static assets — NOT app.js / app.css (they change frequently)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/data/schedule.json',
  '/data/speakers.json',
  '/data/pois.json',
  '/regulamin.html',
  '/polityka-prywatnosci.html',
];

// Never cache these — always fetch from network
const NO_CACHE = ['/app.js', '/app.css', '/team.js', '/sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json().catch(() => ({})) : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'CIEŃ Festiwal', {
      body:  data.body  || '',
      icon:  '/icons/cien-logo.png',
      badge: '/icons/cien-logo.png',
      data:  data,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Always network for: HTML, JS, CSS — never serve stale code
  if (
    url.hostname === self.location.hostname &&
    (url.pathname === '/' || url.pathname.endsWith('.html') ||
     url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
  ) {
    e.respondWith(
      fetch(e.request).then(res => {
        // Cache maps/zamek.html for offline since it's large
        if (url.pathname.includes('zamek.html')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (icons, JSON data, fonts)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
