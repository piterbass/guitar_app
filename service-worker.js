// ============================================================
// service-worker.js  –  Cache offline para Guitar App PWA
// ============================================================

const CACHE_NAME = 'guitar-app-v46';

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
  './js/scale-bank.js',
  './js/custom-scales.js',
  './js/songbook.js',
  './js/song-editor.js',
  './js/song-view.js',
  './js/audio-engine.js',
  './js/scale-position-engine.js',
  './js/full-fretboard-svg.js',
  './js/scales-ui.js',
  './js/custom-scale-builder.js',
  './js/practice-mode.js',
  './js/chord-progressions.js',
  './js/chord-practice.js',
  './js/chord-identifier.js',
  './js/chord-analyzer-ui.js',
  './js/ui.js',
  './js/backup.js',
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

// Fetch: network-first, fallback a cache (evita servir versiones viejas)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((response) => {
      // Actualizar cache con la respuesta fresca
      if (response.ok && event.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      // Sin red → servir desde cache (modo offline)
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        // Offline fallback para navegación
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
