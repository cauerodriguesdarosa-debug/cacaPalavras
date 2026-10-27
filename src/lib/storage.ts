import type { Attempt, Language, LetterStatus, Stats } from './types';

/**
 * Persistência local.
 *
 * O MVP não tem conta nem servidor: tudo vive no `localStorage` do navegador. A
 * consequência importante é que a **perda de dados precisa ser um estado previsto**, não
 * um erro — se o storage estiver bloqueado (aba anônima, cookies desligados, quota
 * estourada), o jogo continua jogável, apenas sem histórico.
 */

const STORAGE_KEY = 'cacaPalavras:v1';

/** Máximo de **dias** de histórico mantidos, para não crescer sem limite. */
const MAX_HISTORY_DAYS = 60;

/** Registro de uma partida do dia. */
export interface DailyRecord {
  outcome: 'won' | 'lost' | 'playing';
  /** Tentativas completas, para poder restaurar a partida em andamento. */
  attempts: Attempt[];
  word: string;
  themeId: string;
}

export interface PersistedState {
  version: 1;
  language: Language;
  stats: Stats;
  /**
   * Registro por partida do dia.
   *
   * A chave é `` `${dateKey}|${language}` `` — **não** só a data. Sem o idioma, as
   * tentativas feitas em português seriam restauradas na partida em inglês, com o
   * feedback calculado contra a resposta do outro idioma: informação visualmente
   * falsa, que faz o jogador decidir com base num tabuleiro que não é o dele.
   */
  daily: Record<string, DailyRecord>;
}

/** Chave de registro: data local + idioma. */
export function dailyKey(dateKey: string, language: Language): string {
  return `${dateKey}|${language}`;
}

export const EMPTY_STATS: Stats = {
  currentStreak: 0,
  bestStreak: 0,
  games: 0,
  daysPlayed: 0,
  wins: 0,
  lastPlayedDate: null,
  lastWord: null,
  guessDistribution: [0, 0, 0, 0, 0, 0],
};

export function defaultState(language: Language = 'pt'): PersistedState {
  return {
    version: 1,
    language,
    stats: { ...EMPTY_STATS },
    daily: {},
  };
}

/** `localStorage` pode simplesmente não existir (SSR, permissões). */
function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reidrata as estatísticas a partir do storage.
 *
 * A validação é **defensiva de propósito**: o `localStorage` pode conter dado
 * corrompido (outra versão do app, extensão do navegador, escrita interrompida).
 * Sem esta checagem, um `guessDistribution` não-array faria `Math.max(1, ...dados)`
 * lançar — e o jogo abriria em branco.
 */
function hydrateStats(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STATS };

  const value = raw as Partial<Stats>;

  const distribution = Array.isArray(value.guessDistribution)
    ? Array.from({ length: EMPTY_STATS.guessDistribution.length }, (_, index) => {
        const count = value.guessDistribution?.[index];
        return typeof count === 'number' && Number.isFinite(count) && count > 0 ? count : 0;
      })
    : [...EMPTY_STATS.guessDistribution];

  const number = (input: unknown, fallback: number) =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : fallback;

  return {
    currentStreak: number(value.currentStreak, 0),
    bestStreak: number(value.bestStreak, 0),
    games: number(value.games, 0),
    daysPlayed: number(value.daysPlayed, 0),
    wins: number(value.wins, 0),
    lastPlayedDate:
      typeof value.lastPlayedDate === 'string' ? value.lastPlayedDate : null,
    lastWord: typeof value.lastWord === 'string' ? value.lastWord : null,
    guessDistribution: distribution,
  };
}

const LETTER_STATUSES: LetterStatus[] = ['correct', 'present', 'absent'];

/**
 * Valida um registro de partida do dia.
 *
 * Sem esta validação, um registro malformado no `localStorage` (extensão de
 * navegador, escrita interrompida, payload de outra versão) chega intacto ao
 * estado da partida — e o primeiro `attempt.statuses.forEach` estoura um
 * `TypeError` que **derruba a tela inteira**. O registro inválido é descartado e o
 * jogo simplesmente começa o dia do zero.
 */
function hydrateRecord(raw: unknown): DailyRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<DailyRecord>;

  if (value.outcome !== 'won' && value.outcome !== 'lost' && value.outcome !== 'playing') {
    return null;
  }
  if (typeof value.word !== 'string' || typeof value.themeId !== 'string') return null;
  if (!Array.isArray(value.attempts)) return null;

  const attempts: Attempt[] = [];
  for (const attempt of value.attempts) {
    if (!attempt || typeof attempt !== 'object') return null;
    const { guess, statuses } = attempt as Partial<Attempt>;
    if (typeof guess !== 'string' || !Array.isArray(statuses)) return null;
    if (guess.length !== statuses.length) return null;
    if (!statuses.every((status) => LETTER_STATUSES.includes(status as LetterStatus))) return null;
    attempts.push({ guess, statuses: statuses as LetterStatus[] });
  }

  return {
    outcome: value.outcome,
    attempts,
    word: value.word,
    themeId: value.themeId,
  };
}

/** Valida o bloco `daily` inteiro, descartando os registros inválidos. */
function hydrateDaily(raw: unknown): Record<string, DailyRecord> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const daily: Record<string, DailyRecord> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const record = hydrateRecord(value);
    if (record) daily[key] = record;
  }
  return daily;
}

/**
 * Carrega o estado salvo.
 * Retorna o estado padrão em qualquer falha — o jogo sempre abre.
 */
export function loadState(): PersistedState {
  const storage = getStorage();
  if (!storage) return defaultState();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1) return defaultState();

    return {
      version: 1,
      language: parsed.language === 'en' ? 'en' : 'pt',
      stats: hydrateStats(parsed.stats),
      daily: hydrateDaily(parsed.daily),
    };
  } catch {
    return defaultState();
  }
}

/** Salva o estado. Falhas são silenciosas: perder histórico não pode quebrar a partida. */
export function saveState(state: PersistedState): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota excedida ou storage bloqueado — o jogo segue funcionando em memória.
  }
}

/**
 * Mantém apenas os N **dias** mais recentes de histórico.
 *
 * A chave do registro é `` `${dateKey}|${language}` ``, então contar chaves seria
 * contar duas vezes: 60 chaves são 30 dias com os dois idiomas. A poda é feita
 * por data distinta.
 */
export function pruneHistory(daily: Record<string, DailyRecord>): Record<string, DailyRecord> {
  const keys = Object.keys(daily).sort();
  const dates = new Set(keys.map((key) => key.split('|')[0]));
  if (dates.size <= MAX_HISTORY_DAYS) return daily;

  const cutoff = [...dates].sort()[dates.size - MAX_HISTORY_DAYS];
  const next: Record<string, DailyRecord> = {};
  for (const key of keys) {
    if (key.split('|')[0] >= cutoff) next[key] = daily[key];
  }
  return next;
}

/** Limpa todo o histórico (usado por uma ação explícita de "zerar dados"). */
export function clearState(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}

/** Data de hoje injetável para testes. */