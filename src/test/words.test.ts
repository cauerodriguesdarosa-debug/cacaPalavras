import { describe, expect, it } from 'vitest';
import { answers, guesses } from '@/data/words/pt';
import { answers as answersEn, guesses as guessesEn } from '@/data/words/en';
import { normalize } from '@/lib/normalize';
import { THEMES, THEME_IDS } from '@/data/themes';
import { isValidGuess } from '@/data/words';

/**
 * Invariantes de conteúdo do banco de palavras.
 *
 * Estas regras são verificadas no CI porque uma falha aqui é silenciosa em tempo de
 * execução: uma palavra com o tamanho errado produz um layout quebrado, e uma
 * resposta ausente do dicionário de tentativas deixa o jogador **sem poder vencer**.
 */

const LANGUAGES = [
  { name: 'pt', answers, guesses },
  { name: 'en', answers: answersEn, guesses: guessesEn },
] as const;

describe.each(LANGUAGES)('banco de palavras — $name', ({ name, answers: byTheme, guesses: byLength }) => {
  it('tem os quatro temas do MVP', () => {
    expect(Object.keys(byTheme).sort()).toEqual([...THEME_IDS].sort());
  });

  it('cada tema tem o comprimento definido', () => {
    for (const themeId of THEME_IDS) {
      const expected = THEMES[themeId].length;
      for (const word of byTheme[themeId]) {
        expect(normalize(word)).toHaveLength(expected);
      }
    }
  });

  it('cada lista de tentativas tem o tamanho correspondente', () => {
    for (const length of [4, 5, 6] as const) {
      for (const word of byLength[length]) {
        expect(normalize(word)).toHaveLength(length);
      }
    }
  });

  it('não há palavras repetidas dentro de um tema', () => {
    for (const themeId of THEME_IDS) {
      const words = byTheme[themeId].map(normalize);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('não há palavras repetidas dentro de uma lista de tentativas', () => {
    for (const length of [4, 5, 6] as const) {
      const words = byLength[length].map(normalize);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('não repete a mesma palavra entre comprimentos diferentes', () => {
    const all = [
      ...byLength[4].map(normalize),
      ...byLength[5].map(normalize),
      ...byLength[6].map(normalize),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it('toda resposta normalizada é uma tentativa válida', () => {
    for (const themeId of THEME_IDS) {
      for (const word of byTheme[themeId]) {
        const normalized = normalize(word);
        expect(isValidGuess(name, normalized, normalized.length)).toBe(true);
      }
    }
  });

  it('as listas de tentativas são apenas letras, sem acento ou cedilha', () => {
    for (const length of [4, 5, 6] as const) {
      for (const word of byLength[length]) {
        expect(word).toMatch(/^[a-z]+$/);
      }
    }
  });

  it('a mesma palavra não aparece em dois temas', () => {
    const seen = new Map<string, string>();
    for (const themeId of THEME_IDS) {
      for (const word of byTheme[themeId]) {
        const normalized = normalize(word);
        const previous = seen.get(normalized);
        expect(previous, `"${word}" aparece em ${themeId} e ${previous}`).toBeUndefined();
        seen.set(normalized, themeId);
      }
    }
  });

  it('tem volume suficiente para a rotação diária', () => {
    for (const themeId of THEME_IDS) {
      expect(byTheme[themeId].length).toBeGreaterThanOrEqual(20);
    }
    for (const length of [4, 5, 6] as const) {
      expect(byLength[length].length).toBeGreaterThanOrEqual(100);
    }
  });
});
