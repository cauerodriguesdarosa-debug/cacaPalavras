import type { GameState, LetterStatus, Stats } from './types';
import { previousDateKey } from './date';

/**
 * Regras de tentativa e sequência.
 *
 * Ficam separadas da UI porque são as regras mais carregadas do produto: qualquer
 * mudança aqui muda o significado de "streak" para o jogador.
 */

/** O PRD define um limite único de 6 tentativas para cada desafio. */
export function maxAttempts(_length: number): number {
  return 6;
}

/** Total de tentativas restantes. */
export function remainingAttempts(state: GameState): number {
  return Math.max(0, maxAttempts(state.length) - state.attempts.length);
}

/**
 * Atualiza a sequência do jogador.
 *
 * O streak conta **dias consecutivos jogados** (vencer ou perder), e só é
 * interrompido quando um dia é pulado. Um dia pulado zera a sequência para 1 no
 * próximo jogo, não para 0 — o jogador sempre "começa" o dia seguinte.
 */
export function applyStreak(stats: Stats, dateKey: string): Stats {
  // Idempotente: jogar duas vezes no mesmo dia não pode inflar a sequência.
  if (stats.lastPlayedDate === dateKey) {
    return stats;
  }

  const continues = stats.lastPlayedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;

  return {
    ...stats,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    // Um dia novo, um dia jogado a mais — mesmo que o jogador faça o desafio
    // de dois idiomas no mesmo dia.
    daysPlayed: stats.daysPlayed + 1,
    lastPlayedDate: dateKey,
  };
}

/** Registra o encerramento de uma partida nas estatísticas. */
export function registerResult(stats: Stats, outcome: 'won' | 'lost', attemptsUsed: number): Stats {
  const distribution = [...stats.guessDistribution];
  const index = Math.max(0, Math.min(distribution.length - 1, attemptsUsed - 1));
  distribution[index] += 1;

  return {
    ...stats,
    games: stats.games + 1,
    wins: stats.wins + (outcome === 'won' ? 1 : 0),
    guessDistribution: distribution,
  };
}

/** Percentual de acerto, arredondado para inteiro. */
export function winRate(stats: Stats): number {
  if (stats.games === 0) return 0;
  return Math.round((stats.wins / stats.games) * 100);
}

/** Verdadeiro quando a partida já foi concluída (vitória ou derrota). */
export function isFinished(state: GameState): boolean {
  return state.outcome !== 'playing';
}

/** Verdadeiro quando a tentativa atual é exatamente a resposta. */
export function isCorrectGuess(guess: string, answer: string): boolean {
  return guess.toLowerCase() === answer.toLowerCase();
}

/** Linhas da grade de feedback a partir das tentativas registradas. */
export function statusRows(state: GameState): LetterStatus[][] {
  return state.attempts.map((attempt) => attempt.statuses);
}
