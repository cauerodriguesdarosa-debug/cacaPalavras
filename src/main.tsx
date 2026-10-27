import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/*
 * Service worker — habilita o funcionamento offline exigido pelo PRD (§ 12).
 *
 * Só é registrado em produção: em desenvolvimento ele serviria o bundle antigo
 * durante o HMR, o que é a forma mais rápida de se perder tempo depurando um bug
 * que já foi corrigido.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        /*
         * Pré-aquece o cache com o que a página já carregou.
         *
         * O worker só assume o controle DEPOIS da primeira visita, então os assets
         * da primeira página nunca passam pelo handler de rede e ficariam fora do
         * cache. Sem esta mensagem, a segunda visita offline abriria o HTML do
         * cache mas sem o JavaScript — uma página em branco, que é pior do que
         * não abrir.
         */
        const resources = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(window.location.origin));

        registration.active?.postMessage({
          type: 'PRECACHE',
          urls: [import.meta.env.BASE_URL, `${import.meta.env.BASE_URL}index.html`, ...resources],
        });
      })
      .catch(() => {
        // Sem service worker o jogo continua funcionando, só não abre offline.
      });
  });
}
