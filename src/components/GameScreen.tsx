import { useEffect } from 'react';
import type { DailyPuzzle, GameState, Language } from '@/lib/types';
import { t, format } from '@/data/strings';
import { THEME_LABELS } from '@/data/themes';
import { Tile } from './Tile';
import { Keyboard } from './Keyboard';
import { Legend } from './Legend';
import { ThemeIllustration } from './ThemeIllustration';
import { deriveKeyState } from '@/lib/feedback';
import { useFocusOnMount } from '@/hooks/useFocusOnMount';
import { maxAttempts } from '@/lib/rules';

/**
 * Tela de partida.
 *
 * Hierarquia da tela, de cima para baixo: identificação do desafio → grade de
 * tentativas → legenda → teclado. A grade é o elemento focal; o teclado é grande o
 * suficiente para dedos pequenos, mas não compete com ela.
 */
interface GameScreenProps {
  language: Language;
  puzzle: DailyPuzzle;
  game: GameState;
  input: string;
  /** Mensagem de erro pronta para exibição, ou `null`. */
  errorMessage: string | null;
  remaining: number;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onExit: () => void;
}

export function GameScreen({
  language,
  puzzle,
  game,
  input,
  errorMessage,
  remaining,
  onLetter,
  onBackspace,
  onSubmit,
  onExit,
}: GameScreenProps) {
  const strings = t(language);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const theme = THEME_LABELS[language][puzzle.themeId];
  const keyState = deriveKeyState(game.attempts);

  // Suporte a teclado físico: digitar, apagar e enviar sem tocar na tela.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      /*
       * `Enter` só é tratado quando o foco **não** está em um controle interativo.
       *
       * Sem essa checagem, o handler global chamava `preventDefault()` e disparava
       * o envio, cancelando a ativação nativa do botão focado. O efeito prático
       * era grave: quem navega só por teclado não conseguia digitar uma letra com
       * Enter — a tecla não digitava, e a palavra era submetida prematuramente.
       */
      const target = event.target as HTMLElement | null;
      const onControl = Boolean(target?.closest('button, a, input, textarea, select, [role="button"]'));

      if (event.key === 'Enter' && !onControl) {
        event.preventDefault();
        onSubmit();
        return;
      }

      /*
       * `Backspace` é sempre tratado.
       *
       * Nenhum controle nativo consome Backspace, então não há conflito. E o caso
       * real é o oposto do que a guarda acima resolvia: no mobile, tocar numa tecla
       * do teclado virtual deixa o foco **no botão** — e o Backspace do teclado
       * físico parava de apagar justamente depois de uma digitação.
       */
      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackspace();
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        onLetter(event.key);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBackspace, onLetter, onSubmit]);

  /*
   * A grade mostra **exatamente** o número de linhas que o jogador tem de
   * tentativas.
   *
   * A fórmula antiga derivava do *comprimento da palavra*, e não do limite de
   * tentativas: a grade usa o limite real de tentativas, sem adicionar uma linha extra
   * — uma linha a mais do que o jogador jamais poderia usar, que só servia para
   * empurrar o teclado para baixo.
   */
  const totalRows = game.attempts.length + (game.outcome === 'playing' ? 1 : 0);
  const emptyRows = Math.max(0, maxAttempts(puzzle.length) - totalRows);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between gap-2 px-3 pt-3">
        <button type="button" className="btn btn--ghost px-3" onClick={onExit}>
          ← {strings.backToHome}
        </button>

        <div className="text-center">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-black"
            style={{ color: 'var(--theme-primary-d, #16202a)' }}
          >
            {theme}
          </h1>
          <p className="text-xs font-semibold text-ink-soft">
            {format(strings.letters, { n: puzzle.length })} ·{' '}
            {format(strings.attemptsLeft, { n: remaining })}
          </p>
        </div>

        <ThemeIllustration themeId={puzzle.themeId} size={32} />
      </header>

      <main id="main" className="flex flex-1 flex-col items-center px-3 pb-4">
        {/* Grade de tentativas.

            A semântica é `list` > `listitem` > `img`: cada linha da grade é um item
            de lista e cada tile é uma imagem com rótulo descritivo. Uma `list` sem
            `listitem` é estrutura ARIA inválida, e leitores de tela podem anunciar
            a lista como vazia.

            O tamanho da tile é calculado em `vw` para que a grade inteira caiba na
            tela mesmo com o limite de 6 tentativas — em 320 px de largura, 13vw
            mantém as 6 linhas e o teclado visíveis sem rolagem. */}
        <div
          className="mt-4 flex flex-col gap-1.5"
          role="list"
          aria-label={strings.boardLabel}
          style={{ '--tile-size': 'clamp(1.9rem, 13vw, 3.4rem)' } as React.CSSProperties}
        >
          {game.attempts.map((attempt, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5" role="listitem">
              {attempt.guess.split('').map((letter, columnIndex) => (
                <Tile
                  key={`${rowIndex}-${columnIndex}`}
                  letter={letter}
                  status={attempt.statuses[columnIndex]}
                  position={columnIndex + 1}
                  language={language}
                  reveal
                  delay={columnIndex * 90}
                />
              ))}
            </div>
          ))}

          {game.outcome === 'playing' ? (
            <div className="flex gap-1.5" role="listitem">
              {Array.from({ length: puzzle.length }, (_, index) => (
                <Tile
                  key={index}
                  letter={input[index] ?? ''}
                  status={input[index] ? 'current' : 'empty'}
                  position={index + 1}
                  language={language}
                />
              ))}
            </div>
          ) : null}

          {Array.from({ length: emptyRows }, (_, index) => (
            <div key={`empty-${index}`} className="flex gap-1.5" role="listitem" aria-hidden="true">
              {Array.from({ length: puzzle.length }, (_, columnIndex) => (
                <div key={columnIndex} className="tile tile--empty" style={{ opacity: 0.45 }} />
              ))}
            </div>
          ))}
        </div>

        {/* Mensagem de erro / estado. */}
        <div className="mt-3 min-h-6 text-center">
          {errorMessage ? (
            <p className="text-sm font-bold text-red-700" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <Legend language={language} />

        <div className="mt-4 w-full max-w-md">
          <Keyboard
            language={language}
            keyState={keyState}
            disabled={game.outcome !== 'playing'}
            onLetter={onLetter}
            onBackspace={onBackspace}
            onSubmit={onSubmit}
            submitLabel={strings.play}
            backspaceLabel={language === 'pt' ? 'Apagar' : 'Delete'}
            submitDisabled={input.length !== puzzle.length}
          />
        </div>
      </main>

      {/*
        A região viva fica em `GameSession`, não aqui: ela precisa sobreviver à
        troca entre a tela de partida e a de resultado, senão o leitor de tela
        perderia justamente a anúncio do fim da partida.
      */}
    </div>
  );
}
