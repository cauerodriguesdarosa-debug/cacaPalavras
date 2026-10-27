import { useCallback, useMemo, useRef, useState } from 'react';
import type { Attempt, DailyPuzzle, GameResult, GameState } from '@/lib/types';
import { computeFeedback } from '@/lib/feedback';
import { maxAttempts } from '@/lib/rules';
import { isValidGuess } from '@/data/words';
import { normalize } from '@/lib/normalize';
import { t, format } from '@/data/strings';

/**
 * Controlador de uma partida.
 *
 * Concentra as regras de tentativa (tamanho, repetição, dicionário) e o cálculo do
 * feedback. A UI só pede para digitar, apagar e enviar — toda a regra mora aqui, o que
 * permite testá-la sem DOM.
 */

export type GameError = 'emptyGuess' | 'wrongLength' | 'repeatedGuess' | 'invalidWord';

export interface UseGame {
  game: GameState;
  /** Texto digitado até agora (sempre normalizado). */
  input: string;
  /** Mensagem de erro da última submissão, ou `null`. */
  error: GameError | null;
  /** Texto da mensagem de erro, já pronta para exibição. */
  errorMessage: string | null;
  /** Texto anunciado por leitores de tela. */
  announcement: string;
  /** Verdadeiro quando a partida terminou. */
  isFinished: boolean;
  /** Número de tentativas restantes. */
  remaining: number;
  typeLetter: (letter: string) => void;
  backspace: () => void;
  submit: () => void;
}

/** Estado inicial de uma partida para o quebra-cabeça dado. */
export function createInitialState(puzzle: DailyPuzzle, isPractice = false): GameState {
  return {
    dateKey: puzzle.dateKey,
    themeId: puzzle.themeId,
    language: puzzle.language,
    length: puzzle.length,
    attempts: [],
    outcome: 'playing',
    isPractice,
  };
}

export function useGame(
  puzzle: DailyPuzzle,
  initialState: GameState,
  handlers: {
    /** Chamado a cada tentativa aceita — permite persistir a partida em andamento. */
    onAttempt?: (attempts: Attempt[]) => void;
    /** Chamado quando a partida termina (vitória ou derrota). */
    onComplete: (result: GameResult) => void;
  },
): UseGame {
  const [game, setGame] = useState<GameState>(initialState);
  const [input, setInput] = useState('');
  const [error, setError] = useState<GameError | null>(null);
  const [announcement, setAnnouncement] = useState('');

  /*
   * Os callbacks são guardados numa referência.
   *
   * O `App` cria o objeto de handlers a cada render. Se `submit` dependesse
   * dele diretamente, o `useEffect` que escuta o teclado físico seria
   * desinscrito e reinscrito a **cada tecla digitada** — dozens de listeners
   * recriados por palavra. Com a referência, o `submit` mantém a identidade e o
   * listener permanece o mesmo.
   */
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  /*
   * O texto digitado e o estado da partida também ficam em referências.
   *
   * Com eles, o `submit` deixa de depender de `input` e `game`, e portanto mantém
   * a mesma identidade entre renders. Sem isso, o `useEffect` da tela de partida
   * (que escuta o teclado físico) desinscrevia e reinscrevia o listener a cada
   * tecla digitada.
   */
  const gameRef = useRef(game);
  gameRef.current = game;
  const inputRef = useRef(input);
  inputRef.current = input;

  const strings = t(puzzle.language);
  const limit = maxAttempts(puzzle.length);
  const isFinished = game.outcome !== 'playing';
  const remaining = Math.max(0, limit - game.attempts.length);

  const typeLetter = useCallback(
    (letter: string) => {
      setError(null);
      // O anúncio anterior (feedback da última tentativa) fica obsoleto assim que
      // o jogador volta a digitar. Limpá-lo evita que o leitor de tela anuncie
      // uma informação que não corresponde mais ao estado.
      setAnnouncement('');
      setInput((current) => {
        if (current.length >= puzzle.length) return current;
        return current + normalize(letter);
      });
    },
    [puzzle.length],
  );

  const backspace = useCallback(() => {
    setError(null);
    setAnnouncement('');
    setInput((current) => current.slice(0, -1));
  }, []);

  const submit = useCallback(() => {
    // Lê o estado corrente pelas referências: é o que permite que este callback
    // mantenha a mesma identidade entre renders (ver nota acima).
    const currentGame = gameRef.current;
    const currentInput = inputRef.current;

    if (currentGame.outcome !== 'playing') return;

    // 1. Vazio — não consome tentativa.
    if (currentInput.length === 0) {
      setError('emptyGuess');
      setAnnouncement('');
      return;
    }

    // 2. Tamanho errado — também não consome tentativa.
    if (currentInput.length !== puzzle.length) {
      setError('wrongLength');
      const diff = puzzle.length - currentInput.length;
      // A mensagem diz o que falta, não apenas que está errado.
      setAnnouncement('');
      void diff;
      return;
    }

    // 3. Tentativa repetida.
    const alreadyTried = currentGame.attempts.some(
      (attempt) => attempt.guess === currentInput,
    );
    if (alreadyTried) {
      setError('repeatedGuess');
      setAnnouncement('');
      return;
    }

    // 4. Palavra inexistente.
    if (!isValidGuess(currentGame.language, currentInput, puzzle.length)) {
      setError('invalidWord');
      setAnnouncement('');
      return;
    }

    // 5. Tentativa válida — calcula o feedback e avança.
    const statuses = computeFeedback(puzzle.answer, currentInput);
    const attempt: Attempt = { guess: currentInput, statuses };
    const attempts = [...currentGame.attempts, attempt];
    const won = currentInput === puzzle.normalizedAnswer;
    const exhausted = attempts.length >= limit;
    const outcome = won ? 'won' : exhausted ? 'lost' : 'playing';

    const nextGame: GameState = { ...currentGame, attempts, outcome };
    setGame(nextGame);
    setInput('');
    setError(null);

    // Anúncio para leitor de tela: descrever a linha inteira, letra a letra.
    const details = statuses
      .map((status, index) => {
        const letter = currentInput[index].toUpperCase();
        if (status === 'correct') return format(strings.letterCorrect, { letter });
        if (status === 'present') return format(strings.letterPresent, { letter });
        return format(strings.letterAbsent, { letter });
      })
      .join('. ');
    const rowAnnouncement = format(strings.rowAnnouncement, { row: attempts.length, details });

    /*
     * Quando a partida termina, o anúncio é o **resultado** — não a linha.
     *
     * A linha é informação intermediária; o que o jogador precisa ouvir ao final é
     * se ganhou e qual era a palavra. Sem isso, a tela de resultado aparece e o
     * leitor de tela só anuncia a última linha, como se nada tivesse acontecido.
     */
    if (outcome === 'won') {
      setAnnouncement(`${strings.won}. ${format(strings.wonSubtitle, { word: puzzle.answer })}`);
    } else if (outcome === 'lost') {
      setAnnouncement(`${strings.lost}. ${format(strings.lostSubtitle, { word: puzzle.answer })}`);
    } else {
      setAnnouncement(rowAnnouncement);
    }

    handlersRef.current.onAttempt?.(attempts);

    if (outcome !== 'playing') {
      handlersRef.current.onComplete({
        outcome,
        attemptsUsed: attempts.length,
        maxAttempts: limit,
        statuses: attempts.map((a) => a.statuses),
        attempts,
        dateKey: puzzle.dateKey,
      });
    }
  }, [limit, puzzle, strings]);

  /**
   * Mensagem de erro pronta para exibição.
   *
   * Fica no hook (e não no componente) para que a mensagem exibida e a mensagem
   * anunciada ao leitor de tela sejam **sempre a mesma frase** — divergir entre os
   * dois canais é uma falha de acessibilidade clássica.
   */
  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (error === 'wrongLength') {
      const diff = puzzle.length - input.length;
      return diff > 0
        ? format(strings.wrongLengthShort, { missing: diff })
        : format(strings.wrongLengthLong, { extra: -diff });
    }
    return strings[error];
  }, [error, input.length, puzzle.length, strings]);

  const state = useMemo(
    () => ({ game, input, error, errorMessage, announcement }),
    [game, input, error, errorMessage, announcement],
  );

  return {
    ...state,
    isFinished,
    remaining,
    typeLetter,
    backspace,
    submit,
  };
}
