/* Service worker compatível com publicação em subdiretório do GitHub Pages. */
const BASE_URL = new URL('./', self.registration.scope);
const INDEX_URL = new URL('index.html', BASE_URL).href;
const CACHE_NAME = 'caca-palavras-v2';
const SHELL = [BASE_URL.href, INDEX_URL];
const MATCH_OPTIONS = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('caca-palavras-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
    try {
      const response = await fetch(INDEX_URL, { cache: 'reload' });
      const html = await response.text();
      const referenced = new Set(SHELL);
      for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        try {
          const url = new URL(match[1], BASE_URL);
          if (url.origin === self.location.origin) referenced.add(url.href);
        } catch { /* ignora URL inválida */ }
      }
      const cache = await caches.open(CACHE_NAME);
      for (const request of await cache.keys()) if (!referenced.has(request.url)) await cache.delete(request);
    } catch { /* mantém o cache se a rede falhar */ }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRECACHE') return;
  const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)))));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const exact = await caches.match(request, MATCH_OPTIONS);
      return exact || await caches.match(INDEX_URL, MATCH_OPTIONS) || Response.error();
    }));
    return;
  }
  event.respondWith(caches.match(request, MATCH_OPTIONS).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && response.type === 'basic') void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
