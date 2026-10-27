/**
 * Tipos de domínio do jogo.
 *
 * Tudo que é "regra de negócio" mora em `src/lib` como função pura, para poder ser
 * testado sem DOM. Este arquivo só declara os shapes.
 */

/** Idiomas suportados no MVP. */
export type Language = 'pt' | 'en';

/** Os quatro temas do MVP. A ordem é fixa e usada na rotação determinística. */
export type ThemeId = 'animals' | 'food' | 'science' | 'sports';

/**
 * Estado de uma letra na grade de feedback.
 *
 * `correct` = letra certa na posição certa
 * `present` = letra existe na palavra, mas em outra posição
 * `absent`  = a letra não existe na palavra
 */
export type LetterStatus = 'correct' | 'present' | 'absent';

/** Estado do teclado virtual. `unused` = ainda não tentada. */
export type KeyStatus = LetterStatus | 'unused';

/** Uma tentativa já submetida, com o feedback calculado. */
export interface Attempt {
  /** Texto normalizado (sem acento) que o jogador digitou. */
  guess: string;
  /** Feedback posicional, na mesma ordem de `guess`. */
  statuses: LetterStatus[];
}

export type GameOutcome = 'playing' | 'won' | 'lost';

/** Estado de uma partida. Usado tanto para o jogo do dia quanto para o treino. */
export interface GameState {
  /** Data local no formato YYYY-MM-DD. No treino, a data em que o treino começou. */
  dateKey: string;
  /** Tema da partida. */
  themeId: ThemeId;
  /** Idioma da partida — define qual dicionário de tentativas vale. */
  language: Language;
  /** Comprimento da palavra. */
  length: number;
  /** Tentativas já submetidas, em ordem. */
  attempts: Attempt[];
  /** Estado atual da partida. */
  outcome: GameOutcome;
  /** Verdadeiro quando a partida é de treino (não afeta streak nem stats). */
  isPractice: boolean;
}

/** Resultado de uma partida encerrada. */
export interface GameResult {
  outcome: Exclude<GameOutcome, 'playing'>;
  attemptsUsed: number;
  maxAttempts: number;
  statuses: LetterStatus[][];
  /** Tentativas completas, para persistir o registro do dia. */
  attempts: Attempt[];
  /** Data local YYYY-MM-DD. */
  dateKey: string;
}

/** Estatísticas agregadas do jogador. */
export interface Stats {
  /** Dias consecutivos jogados (o streak atual). */
  currentStreak: number;
  /** Maior streak já alcançado. */
  bestStreak: number;
  /** Total de partidas concluídas (vitórias + derrotas). */
  games: number;
  /**
   * Dias distintos em que o jogador concluiu uma partida.
   *
   *difere de `games` porque cada idioma tem o seu próprio desafio do dia: quem
   * joga em português e em inglês no mesmo dia faz **2 partidas** em **1 dia**.
   * Sem essa distinção, as duas métricas do PRD (§ 17) medem coisas diferentes sem
   * que nada diga isso ao jogador.
   */
  daysPlayed: number;
  /** Total de vitórias. */
  wins: number;
  /** Último dia jogado, em YYYY-MM-DD. `null` se nunca jogou. */
  lastPlayedDate: string | null;
  /** Última palavra resolvida, com acentuação. */
  lastWord: string | null;
  /** Distribuição de tentativas: índice = nº de tentativas - 1, valor = contagem. */
  guessDistribution: number[];
}

/** O quebra-cabeça do dia, resolvido deterministicamente a partir da data. */
export interface DailyPuzzle {
  /** Data local YYYY-MM-DD. */
  dateKey: string;
  /** Idioma. */
  language: Language;
  /** Tema escolhido para o dia. */
  themeId: ThemeId;
  /** Comprimento da palavra. */
  length: number;
  /** A palavra resposta, **com acentuação** (é assim que aparece na tela). */
  answer: string;
  /** A mesma palavra normalizada (sem acento) — é o que o jogador digita. */
  normalizedAnswer: string;
  /** Número sequencial do dia, para gerar o "palavra do dia nº N". */
  dayNumber: number;
}
