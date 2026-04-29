const CACHE_NAME = 'pro-planner-v6';
const ASSETS = [
  './',
  './index.html',
  './index.html?app=new',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

// 1. Install Event: Saari files ko cache mein daalo
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installing New Version:', CACHE_NAME);
  self.skipWaiting(); // Naye version ko wait nahi karwayega, turant install karega
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Activate Event: Purane caches ko delete karo (Auto-Clean)
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
  return self.clients.claim(); // Turant control le lega saare tabs ka
});

// 3. Fetch Event: Offline support ke liye
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((response) => {
      if (response) return response;

      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
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
