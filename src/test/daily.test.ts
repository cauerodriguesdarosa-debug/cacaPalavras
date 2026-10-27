import { describe, expect, it } from 'vitest';
import { getDailyPuzzle, themeIndexFor } from '@/lib/daily';
import { previousDateKey, toDateKey, dayNumber } from '@/lib/date';

/**
 * O gerador do dia precisa ser **determinístico**: a mesma data produz a mesma
 * palavra para qualquer pessoa, em qualquer dispositivo. Se isso quebrar, o
 * compartilhamento de resultado deixa de fazer sentido.
 */
describe('getDailyPuzzle', () => {
  const date = new Date(2026, 9, 20, 12, 0, 0);

  it('devolve sempre o mesmo quebra-cabeça para a mesma data', () => {
    const first = getDailyPuzzle(date, 'pt');
    const second = getDailyPuzzle(date, 'pt');
    expect(second).toEqual(first);
  });

  it('devolve o mesmo resultado em chamadas com instantes diferentes do mesmo dia', () => {
    const manha = getDailyPuzzle(new Date(2026, 9, 20, 1, 0, 0), 'pt');
    const noite = getDailyPuzzle(new Date(2026, 9, 20, 23, 59, 0), 'pt');
    expect(noite.answer).toBe(manha.answer);
    expect(noite.themeId).toBe(manha.themeId);
  });

  it('troca a palavra em dias consecutivos', () => {
    // A asserção precisa ser sobre a PALAVRA, não sobre a data: comparar as
    // chaves de data é verdadeiro por construção e passaria mesmo com o gerador
    // devolvendo sempre a mesma palavra.
    const hoje = getDailyPuzzle(new Date(2026, 9, 20, 12), 'pt');
    const amanha = getDailyPuzzle(new Date(2026, 9, 21, 12), 'pt');
    expect(amanha.dateKey).not.toBe(hoje.dateKey);
    expect(amanha.answer).not.toBe(hoje.answer);
    expect(amanha.themeId).not.toBe(hoje.themeId);
  });

  it('a palavra muda ao longo de uma janela de 30 dias', () => {
    const palavras = new Set<string>();
    for (let dia = 1; dia <= 30; dia += 1) {
      palavras.add(getDailyPuzzle(new Date(2026, 9, dia, 12), 'pt').answer);
    }
    // Com 30 dias e rotação de 4 temas, as palavras não podem se repetir todas.
    expect(palavras.size).toBeGreaterThan(10);
  });

  it('respeita o comprimento definido pelo tema', () => {
    const expected: Record<string, number> = { animals: 5, food: 4, science: 6, sports: 5 };
    for (let dia = 0; dia < 40; dia += 1) {
      const puzzle = getDailyPuzzle(new Date(2026, 9, 1 + dia, 12), 'pt');
      expect(puzzle.length).toBe(expected[puzzle.themeId]);
    }
  });

  it('a resposta normalizada tem o mesmo comprimento da resposta', () => {
    for (let dia = 0; dia < 40; dia += 1) {
      const puzzle = getDailyPuzzle(new Date(2026, 9, 1 + dia, 12), 'pt');
      expect(puzzle.normalizedAnswer).toHaveLength(puzzle.length);
    }
  });

  it('gera palavras para ambos os idiomas', () => {
    const pt = getDailyPuzzle(date, 'pt');
    const en = getDailyPuzzle(date, 'en');
    // Podem coincidir por acaso, mas o tema e a lista são independentes.
    expect(pt.language).toBe('pt');
    expect(en.language).toBe('en');
    expect(en.length).toBeGreaterThanOrEqual(4);
    expect(en.length).toBeLessThanOrEqual(6);
  });
});

describe('themeIndexFor', () => {
  it('nunca repete o tema do dia anterior', () => {
    let date = new Date(2026, 0, 1, 12);
    for (let i = 0; i < 200; i += 1) {
      const key = toDateKey(date);
      const today = themeIndexFor(key, 'pt');
      const yesterday = themeIndexFor(previousDateKey(key), 'pt');
      expect(today).not.toBe(yesterday);
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12);
    }
  });

  it('é determinístico', () => {
    expect(themeIndexFor('2026-10-20', 'pt')).toBe(themeIndexFor('2026-10-20', 'pt'));
  });
});

describe('dayNumber', () => {
  it('conta dias de forma sequencial', () => {
    expect(dayNumber('2026-10-20')).toBe(dayNumber('2026-10-19') + 1);
  });
});
