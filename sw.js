const CACHE_NAME = 'cien-2026-v86';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/snienie.css',
  '/vendor/fonts/fonts.css',
  '/vendor/phosphor/light.css',
  '/vendor/phosphor/Phosphor-Light.woff2',
  '/icons/uroboros.webp',
  '/icons/slonce-cien.webp',
  '/icons/ksiezyce.webp',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/vendor/fonts/CormorantGaramond-italic-latin-1.woff2',
  '/vendor/fonts/CormorantGaramond-italic-latin-ext-0.woff2',
  '/vendor/fonts/CormorantGaramond-normal-latin-3.woff2',
  '/vendor/fonts/CormorantGaramond-normal-latin-ext-2.woff2',
  '/vendor/fonts/FamiljenGrotesk-normal-latin-5.woff2',
  '/vendor/fonts/FamiljenGrotesk-normal-latin-ext-4.woff2',
  '/team.js',
  '/cropper.min.js',
  '/cropper.min.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/cien-logo.png',
  '/icons/sacrum-logo.png',
  '/icons/ckb_bolkow.png',
  '/data/schedule.json',
  '/data/speakers.json',
  '/data/pois.json',
  '/regulamin.html',
  '/polityka-prywatnosci.html',
];

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
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'CIEŃ Festiwal', {
      body:  data.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data:  data,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const target = d.url || (d.type === 'match' || /match|dopasow/i.test(d.title || '') ? '/#slowdating' : '/');
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => new URL(c.url).origin === self.location.origin);
      if (open) { open.navigate ? open.navigate(target).catch(() => {}) : null; return open.focus(); }
      return clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Dane na żywo (PocketBase, funkcje Netlify) zawsze z sieci — nigdy z pamięci podręcznej
  if (url.pathname.startsWith('/pb/') || url.pathname.startsWith('/.netlify/')) return;

  // Network-first for HTML/JS/CSS on same origin — always fresh, cache as fallback
  if (
    url.hostname === self.location.hostname &&
    (url.pathname === '/' || url.pathname.endsWith('.html') ||
     url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
  ) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (icons, JSON data, fonts)
  // JSON/data files must NEVER fall back to index.html — that would break JSON.parse
  const isData = url.pathname.startsWith('/data/') || url.pathname.endsWith('.json');
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => isData ? Promise.reject(new Error('offline')) : caches.match('/index.html'));
    })
  );
});
