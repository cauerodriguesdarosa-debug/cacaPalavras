/**
 * Service worker do cacaPalavras.
 *
 * O objetivo é simples e declarado no PRD (§ 12): **o jogo precisa abrir offline
 * depois da primeira visita**. O público é de crianças e jovens, com rede instável
 * e plano de dados limitado — ser unable de abrir o jogo no ônibus é uma falha
 * real de produto, não um detalhe técnico.
 *
 * Estratégia:
 * - Navegação: rede primeiro, cache como reserva. Assim uma versão nova do app
 *   chega assim que há rede, e o jogo continua funcionando sem ela.
 * - Assets com hash no nome: cache primeiro. Eles são imutáveis por construção, e
 *   o bundle inteiro cabe no cache (91 KB gzip).
 */

const CACHE_NAME = 'caca-palavras-v1';
const SHELL = ['/', '/index.html'];

/**
 * Opções de casamento no cache.
 *
 * `ignoreVary: true` é **necessário**, não cosmético. O servidor devolve
 * `Vary: Origin`, e o script da aplicação é carregado com `crossorigin` — o que
 * faz a requisição levar o cabeçalho `Origin`. A entrada no cache foi gravada por
 * `cache.add(url)`, sem esse cabeçalho. Com a checagem de `Vary` ativa, o
 * casamento falhava e o app abria **em branco** offline: o HTML vinha do cache,
 * mas o JavaScript não.
 */
const MATCH_OPTIONS = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Caches de outras versões saem inteiros.
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );

      /*
       * Poda os assets das versões anteriores.
       *
       * O nome do cache é fixo, então os arquivos com hash das builds anteriores
       * ficariam lá para sempre — cada deploy adiciona ~90 KB que nunca mais são
       * usados. A lista de assets vem do `index.html` atual: o que não estiver
       * referenciado é de uma versão velha e pode sair.
       */
      try {
        const response = await fetch('/index.html', { cache: 'reload' });
        const html = await response.text();
        const referenced = new Set(['/', '/index.html']);
        for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
          referenced.add(match[1]);
        }

        const cache = await caches.open(CACHE_NAME);
        for (const request of await cache.keys()) {
          const path = new URL(request.url).pathname;
          if (!referenced.has(path)) await cache.delete(request);
        }
      } catch {
        // Sem o index.html não dá para podar. O cache é preservado — perder
        // o offline seria pior do que guardar um asset antigo.
      }

      await self.clients.claim();
    })(),
  );
});

/**
 * Pré-aquece o cache com os recursos que a página já carregou.
 *
 * Sem isso, o service worker só assume o controle **depois** da primeira visita —
 * ou seja, os assets da primeira página nunca passam pelo `fetch` handler e nunca
 * entram no cache. Na segunda visita, offline, o HTML vinha do cache mas o
 * JavaScript não, e o app abria em branco.
 *
 * A página manda a lista de recursos que carregou; o worker os busca e guarda.
 */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'PRECACHE') return;

  const urls = Array.isArray(data.urls) ? data.urls : [];
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(urls.map((url) => cache.add(url).catch(() => undefined))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro, cache como reserva.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // Offline: tenta o caminho exato, depois o shell do app.
        const exact = await caches.match(request, MATCH_OPTIONS);
        if (exact) return exact;
        const index = await caches.match('/index.html', MATCH_OPTIONS);
        if (index) return index;
        const root = await caches.match('/', MATCH_OPTIONS);
        return root ?? Response.error();
      }),
    );
    return;
  }

  // Demais recursos: cache primeiro, com preenchimento sob demanda.
  event.respondWith(
    caches.match(request, MATCH_OPTIONS).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
