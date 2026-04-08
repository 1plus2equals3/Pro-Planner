const CACHE_NAME = 'pro-planner-v9'; // Future mein update ke liye v3, v4 kar dena
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
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
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});