import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearState,
  dailyKey,
  defaultState,
  loadState,
  pruneHistory,
  saveState,
} from '@/lib/storage';

/**
 * Cobertura do módulo de persistência.
 *
 * A auditoria de conformidade encontrou dois bugs **vivos** exatamente nesta
 * fronteira: um `stats` malformado derrubava o app, e um registro `daily`
 * malformado derrubava a tela de partida. O `stats` foi corrigido com validação
 * campo a campo; o `daily` precisou do mesmo tratamento. Estes testes existem para
 * que a próxima versão do schema não reintroduza o problema em silêncio.
 */

const KEY = 'cacaPalavras:v1';

function writeRaw(value: unknown) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

describe('loadState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devolve o estado padrão quando não há nada salvo', () => {
    const state = loadState();
    expect(state.stats.games).toBe(0);
    expect(state.stats.guessDistribution).toHaveLength(6);
    expect(state.daily).toEqual({});
  });

  it('sobrevive a um JSON truncado', () => {
    localStorage.setItem(KEY, '{"version":1,"language":"pt"');
    expect(() => loadState()).not.toThrow();
    expect(loadState().stats.games).toBe(0);
  });

  it('ignora uma versão desconhecida', () => {
    writeRaw({ version: 99, language: 'en', stats: { games: 5 } });
    const state = loadState();
    expect(state.language).toBe('pt');
    expect(state.stats.games).toBe(0);
  });

  it('ignora um idioma inválido', () => {
    writeRaw({ version: 1, language: 'fr', stats: {} });
    expect(loadState().language).toBe('pt');
  });

  it('descarta estatísticas com tipos errados', () => {
    writeRaw({
      version: 1,
      language: 'pt',
      stats: { games: 'muito', wins: null, currentStreak: {}, bestStreak: -3 },
    });
    const stats = loadState().stats;
    expect(stats.games).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(0);
  });

  it('descarta uma distribuição de tentativas que não é array', () => {
    writeRaw({ version: 1, language: 'pt', stats: { guessDistribution: 'nope' } });
    const stats = loadState().stats;
    expect(Array.isArray(stats.guessDistribution)).toBe(true);
    expect(stats.guessDistribution).toHaveLength(6);
    expect(stats.guessDistribution.every((n) => n === 0)).toBe(true);
  });

  it('descarta um registro do dia com tentativas malformadas', () => {
    writeRaw({
      version: 1,
      language: 'pt',
      stats: {},
      daily: {
        [dailyKey('2026-10-22', 'pt')]: {
          outcome: 'playing',
          attempts: 'abc',
          word: 'x',
          themeId: 'food',
        },
      },
    });
    expect(loadState().daily).toEqual({});
  });

  it('descarta um registro com status fora do domínio', () => {
    writeRaw({
      version: 1,
      language: 'pt',
      stats: {},
      daily: {
        [dailyKey('2026-10-22', 'pt')]: {
          outcome: 'playing',
          attempts: [{ guess: 'casa', statuses: ['correct', 'bogus'] }],
          word: 'casa',
          themeId: 'food',
        },
      },
    });
    expect(loadState().daily).toEqual({});
  });

  it('descarta um registro com tamanho de tentativa inconsistente', () => {
    writeRaw({
      version: 1,
      language: 'pt',
      stats: {},
      daily: {
        [dailyKey('2026-10-22', 'pt')]: {
          outcome: 'playing',
          attempts: [{ guess: 'casa', statuses: ['correct'] }],
          word: 'casa',
          themeId: 'food',
        },
      },
    });
    expect(loadState().daily).toEqual({});
  });

  it('descarta um registro com outcome inválido', () => {
    writeRaw({
      version: 1,
      language: 'pt',
      stats: {},
      daily: {
        [dailyKey('2026-10-22', 'pt')]: {
          outcome: 'talvez',
          attempts: [],
          word: 'casa',
          themeId: 'food',
        },
      },
    });
    expect(loadState().daily).toEqual({});
  });

  it('mantém um registro bem formado', () => {
    writeRaw({
      version: 1,
      language: 'en',
      stats: { games: 3, wins: 2 },
      daily: {
        [dailyKey('2026-10-22', 'en')]: {
          outcome: 'won',
          attempts: [{ guess: 'crow', statuses: ['correct', 'correct', 'correct', 'correct'] }],
          word: 'crow',
          themeId: 'animals',
        },
      },
    });
    const state = loadState();
    expect(state.language).toBe('en');
    expect(state.stats.games).toBe(3);
    expect(state.daily[dailyKey('2026-10-22', 'en')]?.outcome).toBe('won');
  });
});

describe('saveState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('faz ida e volta com o estado salvo', () => {
    const state = defaultState('en');
    state.stats.games = 4;
    saveState(state);
    expect(loadState().stats.games).toBe(4);
    expect(loadState().language).toBe('en');
  });
});

describe('pruneHistory', () => {
  it('mantém o histórico quando cabe no limite', () => {
    const daily = {
      [dailyKey('2026-10-20', 'pt')]: {
        outcome: 'won' as const,
        attempts: [],
        word: 'a',
        themeId: 'food',
      },
    };
    expect(pruneHistory(daily)).toEqual(daily);
  });

  it('poda por DATA, não por registro', () => {
    // 70 dias, dois idiomas cada = 140 registros, mas só 70 datas.
    const daily: Record<string, { outcome: 'won'; attempts: never[]; word: string; themeId: string }> =
      {};
    for (let dia = 1; dia <= 70; dia += 1) {
      const date = `2026-07-${String(dia).padStart(2, '0')}`;
      daily[dailyKey(date, 'pt')] = { outcome: 'won', attempts: [], word: 'a', themeId: 'food' };
      daily[dailyKey(date, 'en')] = { outcome: 'won', attempts: [], word: 'a', themeId: 'food' };
    }

    const pruned = pruneHistory(daily);
    const dates = new Set(Object.keys(pruned).map((key) => key.split('|')[0]));
    expect(dates.size).toBe(60);
    // As datas mais antigas saem; as mais recentes ficam.
    expect(pruned[dailyKey('2026-07-01', 'pt')]).toBeUndefined();
    expect(pruned[dailyKey('2026-07-11', 'pt')]).toBeDefined();
  });
});

describe('clearState', () => {
  it('apaga tudo', () => {
    saveState(defaultState());
    expect(localStorage.getItem(KEY)).not.toBeNull();
    clearState();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe('dailyKey', () => {
  it('separa data e idioma', () => {
    expect(dailyKey('2026-10-22', 'pt')).toBe('2026-10-22|pt');
    expect(dailyKey('2026-10-22', 'en')).not.toBe(dailyKey('2026-10-22', 'pt'));
  });
});
