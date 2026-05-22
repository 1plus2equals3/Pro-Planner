const CACHE_NAME = 'pro-planner-v10';
const ASSETS = [
  './',
  './index.html',
  './index.html?app=new',
  './style.css?v=9',
  './app.js?v=10',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installing New Version:', CACHE_NAME);
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
    })
  );
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activating & Cleaning Old Caches...');
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const requestUrl = new URL(e.request.url);
  if (!['http:', 'https:'].includes(requestUrl.protocol)) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok && requestUrl.origin === self.location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', responseClone));
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;

      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok && requestUrl.origin === self.location.origin) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});
