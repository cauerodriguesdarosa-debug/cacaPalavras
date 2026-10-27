import type { GameResult, Language } from '@/lib/types';
import { t, format } from '@/data/strings';

/**
 * Grade de resultado compartilhável.
 *
 * Mostra o *padrão* de acertos, nunca a palavra. É o formato que tornou o gênero
 * viral: a pessoa lê "como você jogou" e quer superar.
 */
export function ShareGrid({ result, language }: { result: GameResult; language: Language }) {
  return (
    <div
      className="flex flex-col gap-1 font-mono text-2xl leading-none"
      role="img"
      aria-label={describeGrid(result, language)}
    >
      {result.statuses.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((status, columnIndex) => (
            <span key={columnIndex} aria-hidden="true">
              {status === 'correct' ? '🟩' : status === 'present' ? '🟨' : '⬛'}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Texto alternativo da grade, para leitores de tela. */
function describeGrid(result: GameResult, language: Language): string {
  const strings = t(language);
  return result.statuses
    .map((row, index) =>
      format(strings.shareRowLabel, {
        row: index + 1,
        details: row
          .map((status) =>
            status === 'correct'
              ? strings.shareCellCorrect
              : status === 'present'
                ? strings.shareCellPresent
                : strings.shareCellAbsent,
          )
          .join(', '),
      }),
    )
    .join('. ');
}
