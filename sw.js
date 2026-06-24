const CACHE_NAME = 'cien-2026-v17';
const ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/team.js',
  '/data/schedule.json',
  '/data/speakers.json',
  '/data/pois.json',
  '/manifest.json',
  '/icons/icon.svg',
  '/maps/zamek.html',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.filter(u => !u.startsWith('http'))))
      .then(() => self.skipWaiting())
  );
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
