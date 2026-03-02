// ============================================================
// service-worker.js  –  Cache offline para Guitar App PWA
// ============================================================

const CACHE_NAME = 'guitar-app-v20';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './js/music-theory.js',
  './js/chord-parser.js',
  './js/voicing-finder.js',
  './js/fretboard-svg.js',
  './js/scale-detector.js',
  './js/harmonic-context.js',
  './js/chord-bank.js',
  './js/songbook.js',
  './js/song-editor.js',
  './js/song-view.js',
  './js/audio-engine.js',
  './js/ui.js',
  './public/header.jpg',
  './public/Magic_Brain_Transparent_4.png',
];

// Instalar: cachear todos los assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: servir desde cache, fallback a red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cachear nuevos requests dinámicamente
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
