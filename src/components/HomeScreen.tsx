import type { DailyPuzzle, Language, Stats } from '@/lib/types';
import { t, format } from '@/data/strings';
import { THEME_LABELS } from '@/data/themes';
import { LanguageSwitch } from './LanguageSwitch';
import { ThemeIllustration } from './ThemeIllustration';
import { useFocusOnMount } from '@/hooks/useFocusOnMount';
import { Countdown } from './Countdown';
import { maxAttempts } from '@/lib/rules';

/**
 * Tela inicial.
 *
 * Uma tela só, com um único objetivo: fazer o jogador entender em poucos segundos
 * o que fazer e começar. Tudo que é secundário (estatísticas, treino, idioma) fica
 * abaixo da dobra, em peso visual menor.
 */
interface HomeScreenProps {
  language: Language;
  puzzle: DailyPuzzle;
  stats: Stats;
  alreadyPlayed: boolean;
  onPlay: () => void;
  onPractice: () => void;
  onStats: () => void;
  onLanguageChange: (language: Language) => void;
}

export function HomeScreen({
  language,
  puzzle,
  stats,
  alreadyPlayed,
  onPlay,
  onPractice,
  onStats,
  onLanguageChange,
}: HomeScreenProps) {
  const strings = t(language);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const theme = THEME_LABELS[language][puzzle.themeId];
  const attempts = maxAttempts(puzzle.length);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-4 pt-4">
        <span className="text-sm font-bold text-ink-soft">
          {format(strings.dayNumber, { n: puzzle.dayNumber })}
        </span>
        <LanguageSwitch language={language} onChange={onLanguageChange} />
      </header>

      <main id="main" className="flex flex-1 flex-col items-center px-4 pb-8 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-6 text-4xl font-black tracking-tight sm:text-5xl"
        >
          {strings.appName}
        </h1>
        <p className="mt-2 text-ink-soft">{strings.tagline}</p>

        {/* Cartão do tema do dia — a peça central da tela. */}
        <section
          className="card mt-6 w-full max-w-sm overflow-hidden p-0"
          style={{ background: 'var(--theme-surface, #ffffff)' }}
          aria-label={strings.todayTheme}
        >
          <div className="px-5 pb-4 pt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
              {strings.todayTheme}
            </p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <ThemeIllustration themeId={puzzle.themeId} size={64} />
              <div className="text-left">
                <p className="text-2xl font-black">{theme}</p>
                <p className="text-sm font-semibold text-ink-soft">
                  {format(strings.letters, { n: puzzle.length })}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-soft">
              {format(strings.howToPlay, { n: attempts })}
            </p>
          </div>

          <div
            className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold"
            style={{ background: 'var(--theme-primary-d, #16202a)', color: '#fff' }}
          >
            <span aria-hidden="true">🔥</span>
            <span>
              {strings.currentStreak}: {stats.currentStreak}
            </span>
          </div>
        </section>

        {alreadyPlayed ? (
          <div className="mt-6 w-full max-w-sm">
            <p className="text-lg font-black">{strings.alreadyPlayed}</p>
            <p className="mt-1 text-sm text-ink-soft">
              <Countdown label={strings.alreadyPlayedHint} />
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
          <button
            type="button"
            className="btn btn--primary text-lg"
            style={{ background: 'var(--theme-primary-d, #16202a)' }}
            onClick={onPlay}
          >
            {/*
              Com o jogo do dia já concluído, o botão principal deixa de ser "jogar" —
              ele passa a oferecer o treino, que é a única coisa que ainda dá para
              fazer. O rótulo precisa acompanhar a ação, senão o botão mente.
            */}
            {alreadyPlayed ? strings.training : strings.play}
          </button>

          <div className="flex gap-2">
            {alreadyPlayed ? null : (
              <button type="button" className="btn btn--secondary flex-1" onClick={onPractice}>
                {strings.training}
              </button>
            )}
            <button type="button" className="btn btn--secondary flex-1" onClick={onStats}>
              {strings.statistics}
            </button>
          </div>
        </div>

        <p className="mt-4 max-w-sm text-xs text-ink-faint">{strings.howToPlayShort}</p>
        <p className="mt-2 max-w-sm text-xs text-ink-faint">{strings.trainingHint}</p>
      </main>
    </div>
  );
}
