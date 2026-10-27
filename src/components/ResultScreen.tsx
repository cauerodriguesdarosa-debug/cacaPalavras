import { useState } from 'react';
import type { DailyPuzzle, GameResult, Language, Stats } from '@/lib/types';
import { t, format } from '@/data/strings';
import { ShareGrid } from './ShareGrid';
import { Confetti } from './Confetti';
import { ThemeIllustration } from './ThemeIllustration';
import { buildShareText, shareOrCopy } from '@/lib/share';
import { useFocusOnMount } from '@/hooks/useFocusOnMount';

/**
 * Tela de resultado.
 *
 * Duas mensagens, e apenas duas: você acertou ou não. Tudo que vem depois é
 * suporte — o histórico da partida, o compartilhamento e o caminho de volta.
 */
interface ResultScreenProps {
  language: Language;
  puzzle: DailyPuzzle;
  result: GameResult;
  stats: Stats;
  /** true quando a partida foi de treino (não afeta streak nem estatísticas). */
  isPractice: boolean;
  onHome: () => void;
  /** Reinicia a partida de treino. Só faz sentido no modo treino. */
  onRestart: () => void;
}

export function ResultScreen({
  language,
  puzzle,
  result,
  stats,
  isPractice,
  onHome,
  onRestart,
}: ResultScreenProps) {
  const strings = t(language);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [copied, setCopied] = useState(false);
  const won = result.outcome === 'won';

  const shareText = buildShareText(puzzle, result, stats);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard bloqueado (contexto inseguro): o botão de compartilhamento nativo
      // ainda funciona, então não tratamos isso como erro fatal.
    }
  }

  async function handleShare() {
    const outcome = await shareOrCopy(shareText);
    // Só afirma "Copiado!" quando copiou de fato. Cancelar o diálogo nativo ou
    // falhar não pode ser reportado como sucesso.
    if (outcome === 'copied' || outcome === 'shared') {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <div className="relative flex min-h-full flex-col">
      {won ? <Confetti /> : null}

      <main id="main" className="relative flex flex-1 flex-col items-center px-4 pb-8 text-center">
        <div
          className="mt-8 grid h-20 w-20 place-items-center rounded-3xl"
          style={{ background: 'var(--theme-surface, #eef1f4)' }}
          aria-hidden="true"
        >
          <ThemeIllustration themeId={puzzle.themeId} size={52} />
        </div>

        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-3xl font-black">
          {won ? strings.won : strings.lost}
        </h1>
        <p className="mt-2 text-lg font-bold text-ink-soft">
          {format(won ? strings.wonSubtitle : strings.lostSubtitle, { word: puzzle.answer })}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {format(strings.usedAttempts, {
            used: result.attemptsUsed,
            total: result.maxAttempts,
          })}
        </p>

        {!isPractice ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm font-black text-white">
            <span aria-hidden="true">🔥</span>
            {strings.currentStreak}: {stats.currentStreak}
          </p>
        ) : null}

        <section className="card mt-6 w-full max-w-xs p-4" aria-label={strings.share}>
          <ShareGrid result={result} language={language} />
          {/*
            Prévia do texto que será copiado. Fica recolhida para não competir com
            o resultado, mas disponível: o jogador deve poder ver o que está
            copiando e compartilhando, e confirmar que a solução não aparece.
          */}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-bold text-ink-soft">
              {strings.previewShare}
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-page p-3 text-left text-xs leading-relaxed text-ink-soft">
              {shareText}
            </pre>
          </details>
        </section>

        <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
          <button
            type="button"
            className="btn btn--primary"
            style={{ background: 'var(--theme-primary, #16202a)' }}
            onClick={handleShare}
          >
            {strings.share}
          </button>
          <button type="button" className="btn btn--secondary" onClick={handleCopy}>
            {copied ? strings.copied : strings.copy}
          </button>
          {isPractice ? (
            <button type="button" className="btn btn--secondary" onClick={onRestart}>
              {strings.playAgain}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={onHome}>
            {strings.backToHome}
          </button>
        </div>

        {copied ? (
          <p className="mt-2 text-sm font-bold text-ink-soft" aria-live="polite">
            {strings.copied}
          </p>
        ) : null}
      </main>
    </div>
  );
}
