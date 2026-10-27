import '@testing-library/jest-dom/vitest';

/**
 * Ambiente de teste.
 *
 * `matchMedia` e `localStorage` precisam existir para que os componentes que
 * verificam preferências do sistema e persistem estado funcionem em jsdom.
 */

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  window.localStorage.clear();
});
