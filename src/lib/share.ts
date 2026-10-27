import type { DailyPuzzle, GameResult, Language, Stats } from './types';
import { t, format } from '@/data/strings';

/**
 * Geração do resultado compartilhado.
 *
 * Regra de negócio: **o compartilhamento nunca revela a solução**. O que ele mostra é o
 * *padrão* de acertos — a mesma ideia da grade de emoji que tornou o gênero viral: a
 * pessoa vê como você jogou e quer superar você.
 */

/** Emoji de cada estado, na ordem da linha. */
const STATUS_EMOJI = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
} as const;

/** Monta as linhas de emoji do resultado. */
export function buildShareGrid(result: GameResult): string {
  return result.statuses
    .map((row) => row.map((status) => STATUS_EMOJI[status]).join(''))
    .join('\n');
}

/**
 * Texto completo para copiar/compartilhar.
 *
 * Inclui o número do dia (cria o ritual de coleção), o grid, o número de tentativas
 * e a sequência atual — mas nunca a palavra.
 */
export function buildShareText(puzzle: DailyPuzzle, result: GameResult, stats: Stats): string {
  const strings = t(puzzle.language);
  const grid = buildShareGrid(result);
  // "usei 1 tentativa" (singular) vs "usei 3 tentativas" — erro de concordância
  // apareceu no texto compartilhado e é visível para quem lê.
  const line =
    result.attemptsUsed === 1
      ? strings.shareTextOne
      : format(strings.shareText, { used: result.attemptsUsed });
  const streak = format(strings.streakLine, { n: stats.currentStreak });

  return [
    `${strings.appName} #${puzzle.dayNumber} ${grid}`,
    line,
    `${streak} · ${result.attemptsUsed}/${result.maxAttempts}`,
  ].join('\n');
}

/** Resultado de uma tentativa de compartilhamento. */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Tenta compartilhar via Web Share API, com fallback para cópia.
 *
 * O retorno é **tipado** porque "cancelou o diálogo nativo" e "copiou para a área
 * de transferência" levavam à mesma resposta — e a tela mostrava "Copiado!" mesmo
 * quando o usuário tinha cancelado, o que é um feedback que mente.
 */
export async function shareOrCopy(text: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      // Cancelamento do usuário não é erro — mas também não é "copiado".
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      // Falha real do compartilhamento nativo: tenta a cópia.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Título curto para o compartilhamento nativo, quando disponível. */
export function shareTitle(language: Language): string {
  return t(language).appName;
}
