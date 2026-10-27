import { describe, expect, it } from 'vitest';
import { buildShareGrid, buildShareText } from '@/lib/share';
import { EMPTY_STATS } from '@/lib/storage';
import type { DailyPuzzle, GameResult } from '@/lib/types';

/**
 * Regra de negócio crítica: **o compartilhamento nunca revela a solução**.
 */
const puzzle: DailyPuzzle = {
  dateKey: '2026-10-20',
  language: 'pt',
  themeId: 'animals',
  length: 5,
  answer: 'cobra',
  normalizedAnswer: 'cobra',
  dayNumber: 142,
};

const result: GameResult = {
  outcome: 'won',
  attemptsUsed: 3,
  maxAttempts: 6,
  statuses: [
    ['absent', 'absent', 'absent', 'absent', 'absent'],
    ['present', 'absent', 'absent', 'absent', 'absent'],
    ['correct', 'correct', 'correct', 'correct', 'correct'],
  ],
  attempts: [
    { guess: 'xxxxx', statuses: ['absent', 'absent', 'absent', 'absent', 'absent'] },
    { guess: 'axxxx', statuses: ['present', 'absent', 'absent', 'absent', 'absent'] },
    { guess: 'cobra', statuses: ['correct', 'correct', 'correct', 'correct', 'correct'] },
  ],
  dateKey: '2026-10-20',
};

describe('buildShareGrid', () => {
  it('gera uma linha por tentativa', () => {
    expect(buildShareGrid(result).split('\n')).toHaveLength(3);
  });

  it('usa um emoji por letra', () => {
    expect(buildShareGrid(result).split('\n')[0]).toBe('⬛⬛⬛⬛⬛');
    expect(buildShareGrid(result).split('\n')[2]).toBe('🟩🟩🟩🟩🟩');
  });
});

describe('buildShareText', () => {
  const stats = { ...EMPTY_STATS, currentStreak: 5 };
  const text = buildShareText(puzzle, result, stats);

  it('não revela a palavra resposta', () => {
    expect(text.toLowerCase()).not.toContain('cobra');
  });

  it('não revela as letras da resposta em sequência', () => {
    expect(text.toLowerCase()).not.toContain('c o b r a');
  });

  it('inclui o número do dia', () => {
    expect(text).toContain('#142');
  });

  it('inclui o número de tentativas e a sequência', () => {
    expect(text).toContain('3/6');
    expect(text).toContain('5');
  });

  it('traduz para inglês', () => {
    const en = buildShareText({ ...puzzle, language: 'en' }, result, stats);
    expect(en).toContain('Streak');
    expect(en).not.toContain('Sequência');
  });

  it('usa o singular quando houve uma única tentativa', () => {
    const one = { ...result, attemptsUsed: 1 };
    expect(buildShareText(puzzle, one, stats)).toContain('usei 1 tentativa!');
    expect(buildShareText(puzzle, one, stats)).not.toContain('tentativas!');
  });
});
