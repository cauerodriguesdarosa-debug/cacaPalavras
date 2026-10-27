import type { LetterStatus } from './types';
import { normalize } from './normalize';

/**
 * Calcula o feedback de uma tentativa contra a resposta.
 *
 * A ordem das passagens é o detalhe que faz o jogo "parecer justo" e é o motivo de
 * esta função ser isolada e testada:
 *
 *  1. **Verdes primeiro.** Cada letra na posição correta é marcada e *consome* uma
 *     ocorrência daquela letra na resposta.
 *  2. **Amarelos depois.** Só as letras restantes podem ser amarelas, e apenas se
 *     ainda houver ocorrências sobrando na resposta.
 *  3. **Cinza é o excedente.** Se a tentativa tem duas "e" e a resposta tem uma,
 *     uma fica verde/amarela e a outra é cinza.
 *
 * Fazer isso na ordem errada (marcando amarelos antes dos verdes) produz resultados
 * que contradizem o que o jogador vê — por exemplo, marcando como cinza uma letra
 * que já estava verde na mesma linha.
 */
export function computeFeedback(answer: string, guess: string): LetterStatus[] {
  const normalizedAnswer = normalize(answer);
  const normalizedGuess = normalize(guess);

  const result: LetterStatus[] = new Array(normalizedGuess.length).fill('absent');
  // Ocorrências de cada letra na resposta que ainda não foram "usadas" por um verde.
  const remaining = new Map<string, number>();

  // Passagem 1 — verdes.
  // O laço percorre a **tentativa**, não a resposta: o feedback descreve as letras que
  // o jogador digitou. A resposta pode ser acessada além do fim da tentativa (palavras
  // de comprimentos diferentes), e essas letras não devem entrar na contagem.
  for (let i = 0; i < normalizedGuess.length; i += 1) {
    if (normalizedGuess[i] === normalizedAnswer[i]) {
      result[i] = 'correct';
    } else if (normalizedAnswer[i] !== undefined) {
      const letter = normalizedAnswer[i];
      remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
    }
  }

  // Passagem 2 — amarelos, consumindo o que sobrou.
  for (let i = 0; i < normalizedGuess.length; i += 1) {
    if (result[i] === 'correct') continue;
    const letter = normalizedGuess[i];
    const left = remaining.get(letter) ?? 0;
    if (left > 0) {
      result[i] = 'present';
      remaining.set(letter, left - 1);
    }
  }

  return result;
}

/**
 * Símbolo redundante ao estado — a cor nunca é o único canal de informação (WCAG 1.4.1).
 *
 * Fonte única de verdade: tanto a tile quanto a tecla do teclado consumem este mapa,
 * para que os dois canais nunca divirjam.
 */
export const STATUS_SYMBOL: Record<LetterStatus, string> = {
  correct: '✓',
  present: '↑',
  absent: '✗',
};

/** Rótulo curto do estado, usado em legendas e no `aria-label`. */
export const STATUS_LABEL: Record<LetterStatus, string> = {
  correct: 'na posição',
  present: 'fora da posição',
  absent: 'não existe',
};

/**
 * Deriva o estado de cada tecla do teclado a partir do histórico de tentativas.
 *
 * A prioridade **não é uma ordem total** — é uma ordem parcial, e isso importa:
 *
 * - `correct` é terminal: uma letra já confirmada na posição certa continua verde.
 * - `absent` é terminal: uma letra já provada inexistente **permanece cinza**, mesmo
 *   que uma tentativa posterior a acerte. O jogador não deve ser levado a usar
 *   de novo uma letra que o jogo já descartou.
 * - `present` pode virar `correct`, mas nunca voltar a ser `absent`.
 *
 * Além disso, o estado é **agregado dentro de cada tentativa**: se a mesma letra
 * aparece duas vezes na linha, o melhor estado vence.
 *
 * Por que agregar? Porque o `computeFeedback` resolve as cópias da mesma letra de
 * forma independente: numa tentativa, a letra `x` pode estar "presente" na posição 1
 * e "ausente" na posição 3 (a cópia foi consumida pelo verde de outra posição).
 * Sem agregar, o teclado terminava exibindo `x` como cinza — **contradizendo a
 * própria grade**, que a mostrava verde. Essa contradição entre os dois canais faz o
 * jogador perder a confiança no tabuleiro.
 *
 * A ordem total ingênua (`correct > present > absent`) erraria justamente nesse
 * caso, devolvendo ao teclado uma letra que o jogador já viu ser descartada.
 */
export function deriveKeyState(
  attempts: ReadonlyArray<{ guess: string; statuses: LetterStatus[] }>,
): Record<string, LetterStatus> {
  const state: Record<string, LetterStatus> = {};
  const rank: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

  for (const attempt of attempts) {
    const guess = normalize(attempt.guess);

    // Melhor status de cada letra DENTRO desta tentativa.
    const best = new Map<string, LetterStatus>();
    attempt.statuses.forEach((status, index) => {
      const letter = guess[index];
      if (!letter) return;
      const current = best.get(letter);
      if (!current || rank[status] > rank[current]) best.set(letter, status);
    });

    for (const [letter, status] of best) {
      const current = state[letter];

      // Estados terminais não mudam.
      if (current === 'absent' || current === 'correct') continue;
      // "presente" não pode ser rebaixado para "ausent".
      if (current === 'present' && status === 'absent') continue;

      if (status === 'correct') {
        state[letter] = 'correct';
        continue;
      }
      if (status === 'absent') {
        state[letter] = 'absent';
        continue;
      }
      // 'present': só define se ainda não havia estado.
      if (!current) state[letter] = 'present';
    }
  }

  return state;
}
