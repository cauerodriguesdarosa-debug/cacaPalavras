import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Attempt, DailyPuzzle, GameResult, GameState, Language, Stats } from '@/lib/types';
import { usePersistedState } from '@/hooks/usePersistedState';
import { createInitialState, useGame } from '@/hooks/useGame';
import { getDailyPuzzleByKey, getPracticePuzzleByKey } from '@/lib/daily';
import { applyStreak, maxAttempts, registerResult } from '@/lib/rules';
import { dailyKey, defaultState } from '@/lib/storage';
import { previousDateKey } from '@/lib/date';
import { useToday } from '@/hooks/useToday';
import { THEMES } from '@/data/themes';
import { t } from '@/data/strings';
import { HomeScreen } from '@/components/HomeScreen';
import { GameScreen } from '@/components/GameScreen';
import { ResultScreen } from '@/components/ResultScreen';
import { StatsScreen } from '@/components/StatsScreen';

/**
 * Raiz da aplicação.
 *
 * Guarda três decisões estruturais:
 *
 * 1. **A partida vive em `GameSession`**, que só é remontado quando começa um jogo
 *    novo. Assim, alternar entre a tela de partida e a de resultado não perde o
 *    histórico da tentativa em andamento.
 * 2. **O tema do dia vira variável CSS** na raiz do documento, em vez de condicional
 *    espalhado por cada componente. Trocar o tema é trocar três custom properties.
 * 3. **Nada de back-end.** O estado vive no `localStorage` e a palavra do dia é
 *    derivada da data.
 */

type Screen = 'home' | 'game' | 'stats';
type GameMode = 'daily' | 'practice';

export function App() {
  const { state, setState, saveDaily, setLanguage } = usePersistedState();
  const [screen, setScreen] = useState<Screen>('home');
  const [sessionId, setSessionId] = useState(0);
  const [mode, setMode] = useState<GameMode>('daily');
  /**
   * Nº de treinos **concluídos** hoje. Define qual palavra o próximo treino sorteia,
   * para que duas sessões de treino não caiam na mesma palavra. A primeira sessão
   * usa o índice 0.
   */
  const [practiceSession, setPracticeSession] = useState(0);

  /*
   * A data local de hoje é estado, não `new Date()` dentro de um memo.
   *
   * A data precisa participar da chave do memo **e** mudar sozinha quando o dia
   * vira: sem isso, uma aba aberta durante a noite continua servindo a palavra de
   * ontem, com o número do dia congelado e o registro gravado na data errada.
   */
  const today = useToday();

  const dailyPuzzle = useMemo(
    () => getDailyPuzzleByKey(today, state.language),
    [today, state.language],
  );
  const practicePuzzle = useMemo(
    () => getPracticePuzzleByKey(today, state.language, practiceSession),
    [today, state.language, practiceSession],
  );

  // O quebra-cabeça ativo depende do modo: o treino joga OUTRA palavra, para não
  // permitir spoilerizar o desafio diário.
  const puzzle = mode === 'practice' ? practicePuzzle : dailyPuzzle;

  // O registro do dia é escopado por idioma.
  const recordKey = dailyKey(dailyPuzzle.dateKey, state.language);
  const todayRecord = state.daily[recordKey];
  const alreadyPlayed = Boolean(todayRecord && todayRecord.outcome !== 'playing');

  /*
   * Partida begun no dia anterior e ainda em andamento.
   *
   * Quem começa a partida às 23:59 e recarrega às 00:01 procura o registro pela
   * chave do dia **novo** e não encontra nada — o progresso some, mesmo com o
   * registro ainda no storage. A busca pelo dia anterior, enquanto ele estiver
   * `playing`, devolve a partida.
   */
  const carriedRecord = state.daily[dailyKey(previousDateKey(today), state.language)];

  // Aplica a paleta do tema do dia na raiz do documento.
  const theme = THEMES[puzzle.themeId];
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.palette.primary);
    root.style.setProperty('--theme-primary-d', theme.palette.dark);
    root.style.setProperty('--theme-accent', theme.palette.accent);
    root.style.setProperty('--theme-surface', theme.palette.surface);
    // O idioma do documento acompanha o idioma do jogo — leitores de tela usam
    // esse atributo para escolher a pronúncia da synthesized speech.
    root.lang = state.language === 'pt' ? 'pt-BR' : 'en';
  }, [state.language, theme]);

  // Trocar o idioma reinicia a partida em andamento: o dicionário e o tema mudam.
  const handleLanguageChange = useCallback(
    (language: Language) => {
      setLanguage(language);
      setScreen('home');
      setSessionId((id) => id + 1);
    },
    [setLanguage],
  );

  // Cada tentativa aceita é persistida, para que recarregar a página no meio do
  // jogo não apague o progresso.
  const handleAttempt = useCallback(
    (attempts: Attempt[]) => {
      if (mode !== 'daily') return;
      saveDaily(dailyKey(puzzle.dateKey, puzzle.language), {
        outcome: 'playing',
        attempts,
        word: puzzle.answer,
        themeId: puzzle.themeId,
      });
    },
    [mode, puzzle, saveDaily],
  );

  const handleComplete = useCallback(
    (result: GameResult) => {
      // Treino não toca em streak nem em estatísticas.
      if (mode !== 'daily') {
        // Um treino concluído avança o índice, para o próximo usar outra palavra.
        setPracticeSession((session) => session + 1);
        return;
      }

      const key = dailyKey(puzzle.dateKey, puzzle.language);

      /*
       * Registro do dia e estatísticas são atualizados na **mesma** operação.
       *
       * Isso não é estética: são dois estados que precisam ficar coerentes. Se o
       * registro fosse gravado antes, em outro `setState`, a guarda de redundância
       * leria o registro já finalizado ('won') e abortaria a contagem — e vice-versa.
       * Uma única atualização atômica elimina a janela entre as duas.
       */
      setState((current) => {
        // Guarda de redundância: se o dia já estava concluído, nada é contabilizado.
        const record = current.daily[key];
        if (record && record.outcome !== 'playing') return current;

        const withStreak = applyStreak(current.stats, puzzle.dateKey);
        const withResult = registerResult(withStreak, result.outcome, result.attemptsUsed);

        return {
          ...current,
          daily: {
            ...current.daily,
            [key]: {
              outcome: result.outcome,
              attempts: result.attempts,
              word: puzzle.answer,
              themeId: puzzle.themeId,
            },
          },
          stats: { ...withResult, lastWord: puzzle.answer },
        };
      });
    },
    [mode, puzzle, setState],
  );

  const startDaily = useCallback(() => {
    setMode('daily');
    setSessionId((id) => id + 1);
    setScreen('game');
  }, []);

  const startPractice = useCallback(() => {
    setMode('practice');
    setSessionId((id) => id + 1);
    setScreen('game');
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-page">
      <a href="#main" className="skip-link">
        {t(state.language).skipToContent}
      </a>

      {screen === 'home' ? (
        <HomeScreen
          language={state.language}
          puzzle={puzzle}
          stats={state.stats}
          alreadyPlayed={alreadyPlayed}
          onPlay={alreadyPlayed ? startPractice : startDaily}
          onPractice={startPractice}
          onStats={() => setScreen('stats')}
          onLanguageChange={handleLanguageChange}
        />
      ) : null}

      {screen === 'game' ? (
        <GameSession
          key={sessionId}
          puzzle={puzzle}
          mode={mode}
          language={state.language}
          stats={state.stats}
          record={mode === 'daily' ? (todayRecord ?? carriedRecord) : undefined}
          onAttempt={handleAttempt}
          onComplete={handleComplete}
          onExit={() => setScreen('home')}
          onRestart={() => setSessionId((id) => id + 1)}
        />
      ) : null}

      {screen === 'stats' ? (
        <StatsScreen
          language={state.language}
          stats={state.stats}
          onBack={() => setScreen('home')}
          onDataCleared={() => {
            // Recarrega o estado persistido a partir do storage agora vazio.
            setState(() => defaultState(state.language));
            setScreen('home');
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Sessão de jogo: mantém o estado da partida e decide entre a tela de partida e a
 * tela de resultado.
 */
interface GameSessionProps {
  puzzle: DailyPuzzle;
  mode: GameMode;
  language: Language;
  stats: Stats;
  /** Registro persistido do dia, usado para restaurar a partida em andamento. */
  record?: { attempts: Attempt[]; outcome: string };
  onAttempt: (attempts: Attempt[]) => void;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
  /** Reinicia a partida atual (usado pelo botão "Jogar de novo" no modo treino). */
  onRestart: () => void;
}

function GameSession({
  puzzle,
  mode,
  language,
  stats,
  record,
  onAttempt,
  onComplete,
  onExit,
  onRestart,
}: GameSessionProps) {
  /*
   * O quebra-cabeça é capturado **no início da sessão**, não lido ao vivo.
   *
   * Concluir um treino avança o índice de palavras do treino, o que recalcula o
   * quebra-cabeça no `App`. Se a sessão continuasse lendo a propriedade "ao vivo",
   * a tela de resultado passaria a anunciar a *próxima* palavra do treino em vez da
   * que foi jogada — e o texto compartilhado sairia com o número do dia errado.
   *
   * `GameSession` é remontado a cada sessão nova (`key={sessionId}`), então a
   * captura vale exatamente para a partida em andamento.
   */
  const [sessionPuzzle] = useState(puzzle);

  const initialState = useMemo<GameState>(() => {
    const base = createInitialState(sessionPuzzle, mode === 'practice');
    if (mode === 'daily' && record && record.outcome === 'playing' && record.attempts.length > 0) {
      return { ...base, attempts: record.attempts, outcome: 'playing' };
    }
    return base;
  }, [mode, sessionPuzzle, record]);

  const game = useGame(sessionPuzzle, initialState, { onAttempt, onComplete });

  return (
    <>
      {game.isFinished ? (
        <ResultScreen
          language={language}
          puzzle={sessionPuzzle}
          result={buildResult(sessionPuzzle, game.game)}
          stats={stats}
          isPractice={mode === 'practice'}
          onHome={onExit}
          onRestart={onRestart}
        />
      ) : (
        <GameScreen
          language={language}
          puzzle={sessionPuzzle}
          game={game.game}
          input={game.input}
          errorMessage={game.errorMessage}
          remaining={game.remaining}
          onLetter={game.typeLetter}
          onBackspace={game.backspace}
          onSubmit={game.submit}
          onExit={onExit}
        />
      )}

      {/*
        Região viva da sessão.

        Ela fica **aqui**, e não dentro de `GameScreen`, porque precisa sobreviver à
        troca de tela no fim da partida: se fosse desmontada junto com a grade, o
        leitor de tela perderia justamente o anúncio mais importante — o resultado
        final. `aria-live="polite"` espera a pausa natural da leitura em vez de
        interromper.
      */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {game.announcement}
      </div>
    </>
  );
}

/** Converte o estado da partida em um resultado serializável. */
function buildResult(puzzle: DailyPuzzle, game: GameState): GameResult {
  return {
    outcome: game.outcome as 'won' | 'lost',
    attemptsUsed: game.attempts.length,
    maxAttempts: maxAttempts(puzzle.length),
    statuses: game.attempts.map((attempt) => attempt.statuses),
    attempts: game.attempts,
    dateKey: puzzle.dateKey,
  };
}
