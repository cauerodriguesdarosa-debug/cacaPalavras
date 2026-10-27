import type { DailyPuzzle, Language, ThemeId } from './types';
import { dateKeyToDayNumber, dayNumber, toDateKey } from './date';
import { normalize } from './normalize';
import { THEMES, THEME_IDS } from '@/data/themes';
import { answersByLanguage } from '@/data/words';

/**
 * Resolução determinística do quebra-cabeça do dia.
 *
 * Requisito de negócio: **a mesma data produz a mesma palavra para todos os usuários**,
 * em qualquer dispositivo e fuso horário. Por isso não há servidor — a palavra é
 * derivada de um PRNG com seed calculada a partir da data.
 */

/** Hash FNV-1a de 32 bits. Determinístico e rápido. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** PRNG mulberry32 — pequeno, rápido e determinístico. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Índice bruto do tema para um **número de dia**.
 *
 * Trabalha com inteiro, e não com a data em string: a cadeia de temas percorre
 * ~1000 dias até a época, e formatar uma data a cada passo custava ~7 ms de JS
 * bloqueante no primeiro render. Com aritmética inteira, o mesmo percurso leva
 * menos de 1 ms.
 */
function rawThemeIndex(dayNumber: number, language: Language): number {
  const rng = mulberry32(hashString(`${dayNumber}|${language}|theme`));
  return Math.floor(rng() * THEME_IDS.length);
}

/** Cache de temas já resolvidos, por `número do dia|idioma`. */
const themeCache = new Map<string, number>();

/**
 * Índice do tema do dia, garantindo que o tema nunca seja o mesmo do dia anterior.
 *
 * A repetição consecutiva é o erro mais perceptível numa rotação diária: o jogador
 * percebe que "o tema não muda" e para de voltar.
 *
 * A regra é **local** — o tema de hoje depende apenas do tema de ontem —, mas isso
 * cria uma dependência em cadeia. A implementação resolve a cadeia a partir de um
 * dia já resolvido (cache) ou da época, e memoiza o resultado.
 *
 * Detalhe que importa: quando o valor bruto de hoje coincide com o tema de ontem,
 * aplicamos **+1 módulo 4**. Esse deslocamento é uma *permutação sem pontos fixos*,
 * então o tema de hoje é garantidamente diferente do de ontem, qualquer que seja o
 * valor bruto.
 *
 * A versão ingênua (comparar apenas com o valor *bruto* de ontem) podia colidir
 * com o tema de ontem **já ajustado** — e a colisão acontecia exatamente nos dias
 * em que três temas brutos coincidiam, que é justamente quando o jogador mais
 * notaria a repetição.
 */
export function themeIndexFor(dateKey: string, language: Language): number {
  const dayNumber = dateKeyToDayNumber(dateKey);
  const cacheKey = `${dayNumber}|${language}`;
  const cached = themeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Caminha para trás, em inteiros, até encontrar um dia já resolvido.
  const pending: number[] = [];
  let cursor = dayNumber;
  let previous = 0;

  for (;;) {
    const key = `${cursor}|${language}`;
    const hit = themeCache.get(key);
    if (hit !== undefined) {
      previous = hit;
      break;
    }
    if (cursor <= 0) {
      // Primeiro dia da série: não tem antecessor, então vale o valor bruto.
      previous = rawThemeIndex(cursor, language);
      themeCache.set(key, previous);
      break;
    }
    pending.push(cursor);
    cursor -= 1;
  }

  // `pending` está na ordem inversa (hoje primeiro); resolve de trás para frente.
  for (let i = pending.length - 1; i >= 0; i -= 1) {
    const day = pending[i];
    const raw = rawThemeIndex(day, language);
    previous = raw !== previous ? raw : (previous + 1) % THEME_IDS.length;
    themeCache.set(`${day}|${language}`, previous);
  }

  return previous;
}

/** Índice da palavra do dia dentro do pool de respostas do tema. */
function dailyWordIndex(dateKey: string, language: Language, themeId: ThemeId, poolLength: number): number {
  const rng = mulberry32(hashString(`${dateKey}|${language}|${themeId}|word`));
  return Math.floor(rng() * poolLength);
}

/**
 * Resolve o quebra-cabeça de uma **chave de data** (YYYY-MM-DD) e idioma.
 *
 * Existe a variante por chave — e não só por `Date` — porque a virada do dia é
 * detectada por hook, e o hook já tem a chave em mãos. Passar um `new Date()`
 * aqui criaria uma dependência implícita do relógio dentro do memo.
 */
export function getDailyPuzzleByKey(dateKey: string, language: Language): DailyPuzzle {
  const themeId = THEME_IDS[themeIndexFor(dateKey, language)];
  const theme = THEMES[themeId];
  const pool = answersByLanguage(language)[themeId];

  const answer = pool[dailyWordIndex(dateKey, language, themeId, pool.length)];

  return {
    dateKey,
    language,
    themeId,
    length: theme.length,
    answer,
    normalizedAnswer: normalize(answer),
    dayNumber: dayNumber(dateKey),
  };
}

/**
 * Quebra-cabeça do **modo treino**.
 *
 * Usa o mesmo tema e o mesmo comprimento do dia, mas uma palavra **diferente** da
 * palavra oficial.
 *
 * Isso é uma decisão de produto, não um detalhe de implementação. Quando o treino
 * jogava a mesma palavra, ele permitia spoilerizar o desafio diário: o jogador
 * descobria a resposta no treino e depois vencia a partida oficial na primeira
 * tentativa — o que zerava o desafio e distorcia a taxa de vitória e a média de
 * tentativas, duas das métricas de sucesso do PRD (§ 17).
 *
 * O índice avança uma posição a partir da palavra do dia, de modo que a palavra de
 * treino é **garantidamente diferente** da oficial, e cada sessão de treino nova
 * (`session`) sorteia outra, evitando repetição.
 */
export function getPracticePuzzleByKey(
  dateKey: string,
  language: Language,
  session = 0,
): DailyPuzzle {
  const themeId = THEME_IDS[themeIndexFor(dateKey, language)];
  const theme = THEMES[themeId];
  const pool = answersByLanguage(language)[themeId];

  const dailyIndex = dailyWordIndex(dateKey, language, themeId, pool.length);
  const index = (dailyIndex + 1 + session) % pool.length;
  const answer = pool[index];

  return {
    dateKey,
    language,
    themeId,
    length: theme.length,
    answer,
    normalizedAnswer: normalize(answer),
    dayNumber: dayNumber(dateKey),
  };
}

/** Atalho: o quebra-cabeça de uma data, no idioma dado. */
export function getDailyPuzzle(date: Date, language: Language): DailyPuzzle {
  return getDailyPuzzleByKey(toDateKey(date), language);
}

/** Atalho: o quebra-cabeça de treino de uma data, no idioma dado. */
export function getPracticePuzzle(date: Date, language: Language, session = 0): DailyPuzzle {
  return getPracticePuzzleByKey(toDateKey(date), language, session);
}

/** Atalho: o quebra-cabeça de hoje, no idioma dado. */
export function getTodayPuzzle(language: Language, now: Date = new Date()): DailyPuzzle {
  return getDailyPuzzleByKey(toDateKey(now), language);
}

/** Todos os temas possíveis, na ordem de rotação. */
