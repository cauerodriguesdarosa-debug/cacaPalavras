import { useEffect, useState } from 'react';
import { toDateKey } from '@/lib/date';

/**
 * A data local de hoje, que muda sozinho quando o dia vira.
 *
 * O produto é "uma palavra por dia". Sem isto, uma aba aberta durante a noite
 * continuaria servindo a palavra de ontem — o número do dia congelado, o
 * registro gravado na data errada e o streak que nunca avança. O jogador
 * perderia o dia sem nenhum sinal na interface.
 *
 * A virada é detectada de duas formas, complementares:
 *
 * 1. um **timeout agendado** para o instante exato da meia-noite local (com uma
 *    folga de alguns segundos, para não perder a corrida com o relógio do
 *    navegador);
 * 2. uma checagem em `focus` e `visibilitychange`, que cobre o caso comum de
 *    quem volta ao app depois de horas com a aba aberta em segundo plano.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    function checkToday() {
      const current = toDateKey(new Date());
      // `setState` com o mesmo valor não re-renderiza — o callback é estável.
      setToday((previous) => (previous === current ? previous : current));
    }

    // Timeout agendado para a próxima meia-noite local.
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      5,
    );
    const timer = window.setTimeout(checkToday, Math.max(1000, nextMidnight.getTime() - now.getTime()));

    window.addEventListener('focus', checkToday);
    document.addEventListener('visibilitychange', checkToday);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', checkToday);
      document.removeEventListener('visibilitychange', checkToday);
    };
  }, [today]);

  return today;
}
