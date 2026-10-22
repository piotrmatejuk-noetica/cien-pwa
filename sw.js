const CACHE_NAME = 'cien-v88';

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

// Sieć z limitem czasu: słaby zasięg nie blokuje startu, po 3 s bierzemy wersję zapisaną
function networkWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
  });
}

function putInCache(request, res) {
  if (res && res.status === 200 && res.type !== 'opaque') {
    const clone = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
  }
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Inne domeny (np. pogoda) i dane na żywo (konta, czat, funkcje) zawsze z sieci, bez zapisu
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/pb/') || url.pathname.startsWith('/.netlify/')) return;

  // Strony, skrypty, style: najnowsze z sieci, ale najwyżej 3 s czekania
  if (e.request.mode === 'navigate' || url.pathname === '/' || /\.(html|js|css)$/.test(url.pathname)) {
    e.respondWith(
      networkWithTimeout(e.request, 3000)
        .then(res => putInCache(e.request, res))
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then(c => c || (e.request.mode === 'navigate' ? caches.match('/index.html') : Promise.reject(new Error('offline')))))
    );
    return;
  }

  // Program i punkty: od razu z pamięci, w tle pobieramy nowszą wersję (zmiany w programie docierają bez aktualizacji appki)
  if (url.pathname.startsWith('/data/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fresh = fetch(e.request).then(res => putInCache(e.request, res));
        if (cached) { e.waitUntil(fresh.catch(() => {})); return cached; }
        return fresh;
      })
    );
    return;
  }

  // Ikony, fonty, zdjęcia: z pamięci, a gdy ich nie ma, z sieci
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => putInCache(e.request, res)))
  );
});
