import { describe, expect, it } from 'vitest';
import { applyStreak, maxAttempts, registerResult, winRate } from '@/lib/rules';
import { EMPTY_STATS } from '@/lib/storage';

/**
 * O streak é a métrica que mais influencia a retenção, e é onde mora a maior
 * chance de bug: ele depende de **datas de calendário locais**, não de tempo
 * decorrido.
 */
describe('maxAttempts', () => {
  it('dá 6 tentativas para palavras de 4 letras', () => {
    expect(maxAttempts(4)).toBe(6);
  });

  it('mantém o limite de 6 tentativas para qualquer tamanho de palavra', () => {
    expect(maxAttempts(4)).toBe(6);
    expect(maxAttempts(5)).toBe(6);
    expect(maxAttempts(6)).toBe(6);
  });
});

describe('applyStreak', () => {
  it('começa em 1 no primeiro dia', () => {
    const stats = applyStreak({ ...EMPTY_STATS }, '2026-10-20');
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
  });

  it('incrementa quando o jogador joga no dia seguinte', () => {
    const primeiro = applyStreak({ ...EMPTY_STATS }, '2026-10-20');
    const segundo = applyStreak(primeiro, '2026-10-21');
    expect(segundo.currentStreak).toBe(2);
    expect(segundo.bestStreak).toBe(2);
  });

  it('zera quando o jogador pula um dia', () => {
    const primeiro = applyStreak({ ...EMPTY_STATS }, '2026-10-20');
    const depois = applyStreak(primeiro, '2026-10-23');
    expect(depois.currentStreak).toBe(1);
  });

  it('preserva o melhor streak já alcançado', () => {
    let stats = { ...EMPTY_STATS };
    stats = applyStreak(stats, '2026-10-01');
    stats = applyStreak(stats, '2026-10-02');
    stats = applyStreak(stats, '2026-10-03');
    expect(stats.bestStreak).toBe(3);

    // Um dia pulado zera o atual, mas o melhor continua 3.
    stats = applyStreak(stats, '2026-10-06');
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(3);
  });

  it('é idempotente: jogar duas vezes no mesmo dia não infla a sequência', () => {
    const primeiro = applyStreak({ ...EMPTY_STATS }, '2026-10-20');
    const repetir = applyStreak(primeiro, '2026-10-20');
    expect(repetir.currentStreak).toBe(1);
  });

  it('funciona atravessando a virada de mês', () => {
    const primeiro = applyStreak({ ...EMPTY_STATS }, '2026-10-31');
    const segundo = applyStreak(primeiro, '2026-11-01');
    expect(segundo.currentStreak).toBe(2);
  });
});

describe('registerResult', () => {
  it('conta a partida e a vitória', () => {
    const stats = registerResult({ ...EMPTY_STATS }, 'won', 3);
    expect(stats.games).toBe(1);
    expect(stats.wins).toBe(1);
    expect(winRate(stats)).toBe(100);
  });

  it('registra a derrota sem vitória', () => {
    const stats = registerResult({ ...EMPTY_STATS }, 'lost', 6);
    expect(stats.games).toBe(1);
    expect(stats.wins).toBe(0);
    expect(winRate(stats)).toBe(0);
  });

  it('distribui as tentativas no histograma', () => {
    const stats = registerResult({ ...EMPTY_STATS }, 'won', 3);
    expect(stats.guessDistribution[2]).toBe(1);
    expect(stats.guessDistribution[0]).toBe(0);
  });
});
