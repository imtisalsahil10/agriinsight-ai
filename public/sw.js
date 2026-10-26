const SHELL = 'agriinsight-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll([
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.webmanifest',
  ])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/advice.json') {
    event.respondWith(
      caches.open('agriinsight-advice')
        .then((cache) => cache.match('/advice.json'))
        .then((hit) => hit || new Response('{"text":""}', { headers: { 'Content-Type': 'application/json' } })),
    );
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
  }
});
