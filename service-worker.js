const APP_CACHE = 'learn-flood-app-v4-9';
const AUDIO_CACHE = 'learn-flood-audio-v3';
const IMAGE_CACHE = 'learn-flood-images-v4-1';
const APP_FILES = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, AUDIO_CACHE, IMAGE_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('learn-flood-') && !keep.has(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.toLowerCase().endsWith('.mp3')) {
    event.respondWith((async () => {
      const cache = await caches.open(AUDIO_CACHE);
      const cached = await cache.match(url.href);
      if (cached && !event.request.headers.has('range')) return cached;
      try { return await fetch(event.request); }
      catch { return new Response('', { status: 503, statusText: 'Audio not available offline' }); }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(APP_CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return new Response('Offline', { status: 503 });
    }
  })());
});
