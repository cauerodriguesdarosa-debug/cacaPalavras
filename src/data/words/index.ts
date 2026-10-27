import type { Language, ThemeId } from '@/lib/types';
import { normalize, isPlainLetters } from '@/lib/normalize';
import { answers as ptAnswers, guesses as ptGuesses } from './pt';
import { answers as enAnswers, guesses as enGuesses } from './en';

/**
 * Índice do banco de palavras.
 *
 * Existem **duas** listas, comfinalidades diferentes:
 *
 * - `answers` — as palavras-resposta, agrupadas por tema. Curta e curada, é o que o
 *   gerador do dia sorteia.
 * - `guesses` — o dicionário de tentativas aceitas, agrupado por comprimento. Bem mais
 *   amplo, é o que valida a digitação do jogador.
 *
 * Separar as duas é o que permite ao jogo ser "justo": o jogador pode tentar
 * milhares de palavras, mas a resposta do dia sempre está na lista de respostas.
 */

const ANSWERS: Record<Language, Record<ThemeId, string[]>> = {
  pt: ptAnswers,
  en: enAnswers,
};

const RAW_GUESSES: Record<Language, Record<number, string[]>> = {
  pt: { 4: ptGuesses[4], 5: ptGuesses[5], 6: ptGuesses[6] },
  en: { 4: enGuesses[4], 5: enGuesses[5], 6: enGuesses[6] },
};

/**
 * Conjuntos de tentativas válidas, com normalização aplicada.
 *
 * Montados uma única vez no carregamento do módulo: `Set.has` é O(1) e a validação
 * acontece a cada tecla digitada.
 */
const GUESS_SETS: Record<Language, Record<number, Set<string>>> = {
  pt: {
    4: new Set(RAW_GUESSES.pt[4].map(normalize)),
    5: new Set(RAW_GUESSES.pt[5].map(normalize)),
    6: new Set(RAW_GUESSES.pt[6].map(normalize)),
  },
  en: {
    4: new Set(RAW_GUESSES.en[4].map(normalize)),
    5: new Set(RAW_GUESSES.en[5].map(normalize)),
    6: new Set(RAW_GUESSES.en[6].map(normalize)),
  },
};

/**
 * Rede de segurança: garante que a resposta do dia é sempre jogável.
 *
 * Se o conteúdo curated tiver um buraco (uma palavra-resposta que ficou de fora do
 * dicionário de tentativas), o jogador ficaria preso sem poder vencer. Aqui
 * injetamos a forma normalizada de toda resposta nos conjuntos correspondentes.
 */
for (const language of ['pt', 'en'] as const) {
  for (const words of Object.values(ANSWERS[language])) {
    for (const word of words) {
      const normalized = normalize(word);
      const set = GUESS_SETS[language][normalized.length];
      if (set) set.add(normalized);
    }
  }
}

/** Palavras-resposta de um idioma, por tema. */
export function answersByLanguage(language: Language): Record<ThemeId, string[]> {
  return ANSWERS[language];
}

/** Dicionário de tentativas válidas de um idioma e comprimento. */
export function guessSet(language: Language, length: number): Set<string> | undefined {
  return GUESS_SETS[language][length];
}

/**
 * Verifica se uma tentativa é uma palavra válida.
 *
 * A comparação é feita sobre a forma normalizada, então "Maca" e "maca" são a mesma
 * tentativa — e uma tentativa acentuada que o jogador não consegue digitar no teclado
 * virtual ainda é aceita.
 */
export function isValidGuess(language: Language, word: string, length: number): boolean {
  const normalized = normalize(word);
  // Guarda defensiva: o dicionário só contém letras, então qualquer coisa fora
  // desse padrão é automaticamente inválida.
  if (!isPlainLetters(normalized)) return false;
  const set = GUESS_SETS[language][length];
  if (!set) return false;
  return set.has(normalized);
}

/** Quantidade de tentativas aceitas por comprimento — usado em métricas de conteúdo. */
export function guessCount(language: Language, length: number): number {
  return GUESS_SETS[language][length]?.size ?? 0;
}
