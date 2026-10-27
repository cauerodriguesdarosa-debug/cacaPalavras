import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultState, loadState, pruneHistory, saveState } from '@/lib/storage';
import type { PersistedState } from '@/lib/storage';

/**
 * Estado da aplicação persistido no `localStorage`.
 *
 * A gravação é **debounced** por efeito: escrever em `localStorage` a cada tecla seria
 * custoso, e o estado só muda em eventos discretos (fim de partida, troca de idioma).
 */
export interface UsePersistedState {
  state: PersistedState;
  /** Substitui o estado inteiro. */
  setState: (updater: (current: PersistedState) => PersistedState) => void;
  /** Atualiza um registro de partida do dia. */
  saveDaily: (dateKey: string, record: PersistedState['daily'][string]) => void;
  /** Troca o idioma e persiste. */
  setLanguage: (language: PersistedState['language']) => void;
}

/** Intervalo de agrupamento das gravações, em ms. */
const WRITE_DEBOUNCE_MS = 150;

export function usePersistedState(): UsePersistedState {
  const [state, setStateInternal] = useState<PersistedState>(() => loadState());

  // Referência ao estado mais recente, para conseguir descarregar a fila de
  // gravação sem depender do closure do efeito.
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveState({ ...state, daily: pruneHistory(state.daily) });
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  /*
   * Descarregamento da gravação.
   *
   * O debounce deixa uma janela de 150 ms em que a última alteração ainda não
   * chegou ao `localStorage`. Se a aba fosse fechada nesse instante — o jogador
   * vence e fecha o app imediatamente — a partida do dia se perderia. Para um
   * jogo de sequência diária, perder o dia é a pior falha possível.
   *
   * `pagehide` é o evento certo: dispara tanto no fechamento da aba quanto na
   * navegação para o histórico, e é mais confiável que `beforeunload` (que o
   * navegador pode não dar tempo de processar).
   */
  useEffect(() => {
    function flush() {
      saveState({ ...latest.current, daily: pruneHistory(latest.current.daily) });
    }
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      // Desmontagem: garante a gravação mesmo sem o evento de página.
      flush();
    };
  }, []);

  const setState = useCallback((updater: (current: PersistedState) => PersistedState) => {
    setStateInternal((current) => updater(current));
  }, []);

  const saveDaily = useCallback(
    (dateKey: string, record: PersistedState['daily'][string]) => {
      setStateInternal((current) => ({
        ...current,
        daily: { ...current.daily, [dateKey]: record },
      }));
    },
    [],
  );

  const setLanguage = useCallback((language: PersistedState['language']) => {
    setStateInternal((current) => ({ ...current, language }));
  }, []);

  return { state, setState, saveDaily, setLanguage };
}

export { defaultState };
