import { useEffect, useState } from 'react';
import { formatCountdown, msUntilNextDay } from '@/lib/date';

/**
 * Contagem regressiva até o próximo dia local.
 *
 * O estado fica **aqui**, e não na tela que a exibe: se o contador morasse na tela
 * inicial, cada segundo re-renderizaria o cartão do tema, a ilustração SVG e o
 * cartão de sequência — tudo para mudar três caracteres. Com o contador isolado,
 * só o próprio texto re-renderiza.
 *
 * A lógica de tempo vive em `src/lib/date.ts`; aqui só o efeito de temporização.
 */
export function Countdown({ label }: { label: string }) {
  const [remaining, setRemaining] = useState(() => msUntilNextDay());

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(msUntilNextDay()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span aria-live="off">
      {label.replace('{time}', formatCountdown(remaining))}
    </span>
  );
}
