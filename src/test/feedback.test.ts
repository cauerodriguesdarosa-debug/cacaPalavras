import { describe, expect, it } from 'vitest';
import { computeFeedback, deriveKeyState } from '@/lib/feedback';

/**
 * O algoritmo de feedback é o coração do jogo. Estes casos cobrem a ordem das
 * passagens (verde antes de amarelo), o tratamento de letras repetidas e a
 * comparação sem acento.
 */
describe('computeFeedback', () => {
  it('marca verde quando a letra está na posição correta', () => {
    // "c__a_" contra "cobra": c verde na posição 0, "a" amarelo (existe na posição 4).
    expect(computeFeedback('cobra', 'c__a_')).toEqual([
      'correct',
      'absent',
      'absent',
      'present',
      'absent',
    ]);
  });

  it('marca amarelo quando a letra existe em outra posição', () => {
    // "arbro" contra "cobra": b(2) e r(3) estão na posição certa; a(0) e o(4) existem.
    expect(computeFeedback('cobra', 'arbro')).toEqual([
      'present',
      'absent',
      'correct',
      'correct',
      'present',
    ]);
  });

  it('marca cinza quando a letra não existe', () => {
    const result = computeFeedback('cobra', 'zzzzz');
    expect(result.every((status) => status === 'absent')).toBe(true);
  });

  it('resolve a palavra inteira quando a tentativa é igual à resposta', () => {
    expect(computeFeedback('cobra', 'cobra')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  describe('letras repetidas', () => {
    it('marca apenas as ocorrências que a resposta comporta', () => {
      // "cobra" tem um "r" e um "a"; "arroa" repete ambos.
      const result = computeFeedback('cobra', 'arroa');
      expect(result).toEqual(['absent', 'present', 'absent', 'present', 'correct']);
    });

    it('respeita a contagem exata de ocorrências', () => {
      // "banana" tem dois "a" (posições 1 e 3) — as demais tentativas de "a" são cinza.
      const result = computeFeedback('banana', 'aaaaaa');
      expect(result).toEqual(['absent', 'correct', 'absent', 'correct', 'absent', 'correct']);
    });

    it('não deixa a tentativa mais curta que a resposta roubar uma letra', () => {
      // "banana" tem três "a"; a tentativa "aaaaa" só pode confirmar os que couberem
      // na posição certa — a letra extra da resposta não pode virar amarelo.
      const result = computeFeedback('banana', 'aaaaa');
      expect(result).toEqual(['absent', 'correct', 'absent', 'correct', 'absent']);
    });

    it('nunca confirma a mesma letra mais vezes do que a resposta tem', () => {
      const result = computeFeedback('cobra', 'aaaaa');
      const positives = result.filter((s) => s !== 'absent');
      expect(positives).toHaveLength(1);
    });
  });

  describe('acentuação', () => {
    it('compara ignorando acentos', () => {
      expect(computeFeedback('maçã', 'maca')).toEqual([
        'correct',
        'correct',
        'correct',
        'correct',
      ]);
    });

    it('aceita tentativa acentuada contra resposta acentuada', () => {
      expect(computeFeedback('célula', 'celula').every((s) => s === 'correct')).toBe(true);
    });

    it('trata cedilha como a letra base', () => {
      const result = computeFeedback('peixe', 'peixe');
      expect(result.every((s) => s === 'correct')).toBe(true);
    });
  });
});

describe('deriveKeyState', () => {
  it('registra o estado de cada letra tentada', () => {
    const state = deriveKeyState([
      { guess: 'carta', statuses: ['correct', 'absent', 'present', 'absent', 'correct'] },
    ]);
    expect(state.c).toBe('correct');
    expect(state.r).toBe('present');
    expect(state.t).toBe('absent');
  });

  it('verde tem prioridade sobre amarelo para a mesma letra', () => {
    const state = deriveKeyState([
      { guess: 'carta', statuses: ['correct', 'absent', 'present', 'absent', 'correct'] },
      { guess: 'cobra', statuses: ['correct', 'correct', 'correct', 'correct', 'correct'] },
    ]);
    // "r" era amarelo na primeira linha e verde na segunda: deve ficar verde.
    expect(state.r).toBe('correct');
  });

  it('cinza não é rebaixado para amarelo por tentativas posteriores', () => {
    const state = deriveKeyState([
      { guess: 'arbro', statuses: ['absent', 'absent', 'absent', 'absent', 'absent'] },
      { guess: 'cobra', statuses: ['correct', 'correct', 'correct', 'correct', 'correct'] },
    ]);
    expect(state.a).toBe('absent');
  });

  /**
   * Regressão: o teclado não pode exibir como cinza uma letra que a própria grade
   * mostra verde.
   *
   * Na linha 1, o "x" está presente na posição 1 e ausente na posição 3 (a cópia
   * foi consumida). Na linha 2, o "x" fica verde. Sem agregar o estado dentro de
   * cada tentativa, o teclado terminava mostrando "x" cinza e desabilitado.
   */
  it('agrega o melhor estado da letra dentro da mesma tentativa', () => {
    const state = deriveKeyState([
      { guess: 'zxzya', statuses: ['absent', 'present', 'absent', 'absent', 'absent'] },
      { guess: 'zxxzz', statuses: ['absent', 'absent', 'correct', 'absent', 'absent'] },
    ]);
    // A grade da linha 2 mostra "x" verde: o teclado tem que concordar.
    expect(state.x).toBe('correct');
  });

  it('não rebaixa uma letra presente para ausente', () => {
    const state = deriveKeyState([
      { guess: 'abcde', statuses: ['present', 'absent', 'absent', 'absent', 'absent'] },
      { guess: 'fghij', statuses: ['absent', 'absent', 'absent', 'absent', 'absent'] },
    ]);
    expect(state.a).toBe('present');
  });
});
