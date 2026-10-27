/**
 * Utilitários de data local.
 *
 * Regra do produto: a "palavra do dia" e o streak são definidos pela **data de
 * calendário do usuário**, no fuso local — nunca por timestamp UTC. Se usássemos UTC,
 * um jogador em UTC-3 veria a palavra trocadas às 21h, e o streak quebraria com
 * travelers de fuso.
 */

/** Formato de data usado em toda a persistência: `YYYY-MM-DD`. */
export type DateKey = string;

/** Converte um `Date` para a chave de data local `YYYY-MM-DD`. */
export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converte uma chave `YYYY-MM-DD` de volta para um `Date` local (meio-dia, imune a DST). */
export function fromDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** Chave da data anterior à informada. */
export function previousDateKey(key: DateKey): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

/** Chave da data de hoje no fuso local do navegador. */
export function todayDateKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

/** Época da sequência: 2024-01-01, em milissegundos UTC. */
const EPOCH_MS = Date.UTC(2024, 0, 1);

/**
 * Quantos dias se passaram desde a época.
 *
 * É a representação **inteira** de uma data local, usada internamente para
 * algoritmos que precisam caminhar por dias. Converter data em string a cada passo
 * de uma cadeia de ~1000 dias é o que tornava a rotação de temas lenta.
 */
export function dateKeyToDayNumber(key: DateKey): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor((Date.UTC(year, month - 1, day) - EPOCH_MS) / 86_400_000);
}

/**
 * Número sequencial do dia, contando a partir de 2024-01-01.
 * Usado no rótulo "palavra do dia nº N", que cria a sensação de coleção.
 */
export function dayNumber(key: DateKey): number {
  return dateKeyToDayNumber(key) + 1;
}

/**
 * Milissegundos restantes até o próximo dia local (meia-noite).
 * Usado na contagem regressiva da tela inicial quando o jogo do dia já foi feito.
 */
export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Formata uma duração em ms como "HH:MM:SS" para a contagem regressiva. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}
