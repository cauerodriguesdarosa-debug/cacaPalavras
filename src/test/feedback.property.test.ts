import { describe, expect, it } from 'vitest';
import { computeFeedback, deriveKeyState } from '@/lib/feedback';

/**
 * Testes de propriedade do algoritmo de feedback.
 *
 * Os casos fixos de `feedback.test.ts` cobrem exemplos conhecidos. Estes aqui
 * verificam **invariantes que valem para qualquer entrada** — é o que pega a
 * classe de bug em que um caso específico passa e a regra geral está errada.
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** Gerador pseudoaleatório determinístico, para que a falha seja reproduzível. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomWord(random: () => number, length: number): string {
  let word = '';
  for (let i = 0; i < length; i += 1) {
    word += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return word;
}

function countLetter(word: string, letter: string): number {
  return [...word].filter((char) => char === letter).length;
}

describe('propriedades do feedback', () => {
  it('nunca confirma mais cópias de uma letra do que a resposta tem', () => {
    const random = makeRandom(20261022);

    for (let round = 0; round < 2000; round += 1) {
      const length = 4 + Math.floor(random() * 3);
      const answer = randomWord(random, length);
      const guess = randomWord(random, length);
      const statuses = computeFeedback(answer, guess);

      for (const letter of new Set([...answer, ...guess])) {
        const matching = statuses.filter(
          (_, index) => guess[index] === letter && statuses[index] !== 'absent',
        ).length;
        expect(matching).toBeLessThanOrEqual(countLetter(answer, letter));
      }
    }
  });

  it('verde só aparece quando a letra está exatamente na posição', () => {
    const random = makeRandom(777);

    for (let round = 0; round < 2000; round += 1) {
      const length = 4 + Math.floor(random() * 3);
      const answer = randomWord(random, length);
      const guess = randomWord(random, length);
      const statuses = computeFeedback(answer, guess);

      statuses.forEach((status, index) => {
        if (status === 'correct') {
          expect(guess[index]).toBe(answer[index]);
        }
      });
    }
  });

  it('nunca devolve mais posições do que a tentativa tem', () => {
    const random = makeRandom(31337);

    for (let round = 0; round < 500; round += 1) {
      const answer = randomWord(random, 4 + Math.floor(random() * 3));
      const guess = randomWord(random, 1 + Math.floor(random() * 8));
      expect(computeFeedback(answer, guess)).toHaveLength(guess.length);
    }
  });

  it('acertar a palavra inteira produz verde em todas as posições', () => {
    const random = makeRandom(4242);

    for (let round = 0; round < 500; round += 1) {
      const answer = randomWord(random, 4 + Math.floor(random() * 3));
      const statuses = computeFeedback(answer, answer);
      expect(statuses.every((status) => status === 'correct')).toBe(true);
    }
  });

  /**
   * A invariante mais importante do teclado: **ele não pode contradizer a grade**.
   *
   * Se a grade mostra uma letra verde, a tecla correspondente não pode estar
   * cinza nem desabilitada. A verificação usa tentativas todas contra a MESMA
   * resposta — misturar respostas tornaria a comparação sem sentido.
   */
  it('o estado do teclado nunca contradiz a grade', () => {
    const random = makeRandom(9001);

    for (let round = 0; round < 800; round += 1) {
      const length = 4 + Math.floor(random() * 3);
      const answer = randomWord(random, length);

      const attempts: Array<{ guess: string; statuses: ReturnType<typeof computeFeedback> }> = [];
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const guess = randomWord(random, length);
        attempts.push({ guess, statuses: computeFeedback(answer, guess) });
      }

      const keyState = deriveKeyState(attempts);

      for (const attempt of attempts) {
        attempt.statuses.forEach((status, index) => {
          const letter = attempt.guess[index];
          const keyStatus = keyState[letter];
          if (!keyStatus) return;
          if (status === 'correct') expect(keyStatus).toBe('correct');
          if (status === 'present') expect(keyStatus).not.toBe('absent');
        });
      }
    }
  });
});
