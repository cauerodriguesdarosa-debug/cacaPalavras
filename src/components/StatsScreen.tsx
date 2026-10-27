import { useState } from 'react';
import type { Language, Stats } from '@/lib/types';
import { t } from '@/data/strings';
import { winRate } from '@/lib/rules';
import { clearState } from '@/lib/storage';
import { useFocusOnMount } from '@/hooks/useFocusOnMount';

/**
 * Tela de estatísticas.
 *
 * Existe para dar sentido de progresso: o jogador vê o próprio histórico e forma
 * metas de longo prazo. O histograma de tentativas mostra a distribuição, que é
 * a informação mais "de jogo" da tela.
 *
 * Também é onde mora o **controle de privacidade**: como todo o histórico do
 * jogador vive no `localStorage` do navegador, apagar esses dados tem de ser uma
 * ação de um clique, não uma tarefa de suporte.
 */
interface StatsScreenProps {
  language: Language;
  stats: Stats;
  onBack: () => void;
  /** Chamado depois que os dados locais são apagados. */
  onDataCleared: () => void;
}

export function StatsScreen({ language, stats, onBack, onDataCleared }: StatsScreenProps) {
  const strings = t(language);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const rate = winRate(stats);
  const max = Math.max(1, ...stats.guessDistribution);
  const [confirming, setConfirming] = useState(false);

  const cards: Array<{ label: string; value: string; icon: string }> = [
    { label: strings.currentStreak, value: String(stats.currentStreak), icon: '🔥' },
    { label: strings.bestStreak, value: String(stats.bestStreak), icon: '🏆' },
    { label: strings.daysPlayed, value: String(stats.daysPlayed), icon: '📅' },
    { label: strings.gamesPlayed, value: String(stats.games), icon: '🎯' },
    { label: strings.wins, value: String(stats.wins), icon: '✅' },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-3 pt-3">
        <button type="button" className="btn btn--ghost px-3" onClick={onBack}>
          ← {strings.backToHome}
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-lg font-black">
          {strings.statistics}
        </h1>
        <span className="w-16" aria-hidden="true" />
      </header>

      <main id="main" className="flex flex-1 flex-col px-4 pb-8">
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="card p-3 text-center">
              <span className="text-2xl" aria-hidden="true">
                {card.icon}
              </span>
              <p className="mt-1 text-2xl font-black leading-none">{card.value}</p>
              <p className="mt-1 text-xs font-semibold text-ink-soft">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="card mt-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink-soft">{strings.winRate}</p>
            <p className="text-2xl font-black">{rate}%</p>
          </div>
          {stats.lastWord ? (
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <p className="text-sm font-bold text-ink-soft">{strings.lastWord}</p>
              <p className="text-lg font-black uppercase">{stats.lastWord}</p>
            </div>
          ) : null}
        </div>

        <section className="card mt-3 p-4" aria-label={strings.distribution}>
          <h2 className="text-sm font-black uppercase tracking-wide text-ink-soft">
            {strings.distribution}
          </h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {stats.guessDistribution.map((count, index) => {
              const attempts = index + 1;
              return (
                <li key={attempts} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-right text-sm font-bold text-ink-soft">
                    {attempts}
                  </span>
                  <span
                    className="h-6 rounded-md"
                    style={{
                      width: `${Math.max(2, (count / max) * 100)}%`,
                      background: 'var(--theme-primary, #16202a)',
                    }}
                  />
                  <span className="ml-auto text-sm font-bold">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Controle de privacidade. */}
        <section className="mt-3 border-t border-line pt-3">
          {confirming ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-soft">{strings.clearConfirm}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn--secondary px-3"
                  onClick={() => setConfirming(false)}
                >
                  {strings.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary px-3"
                  style={{ borderColor: '#b42318', color: '#b42318' }}
                  onClick={() => {
                    clearState();
                    setConfirming(false);
                    onDataCleared();
                  }}
                >
                  {strings.clearConfirmAction}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--ghost px-0"
              onClick={() => setConfirming(true)}
            >
              {strings.clearData}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
