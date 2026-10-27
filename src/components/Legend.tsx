import type { Language, LetterStatus } from '@/lib/types';
import { t } from '@/data/strings';
import { STATUS_SYMBOL } from '@/lib/feedback';

/**
 * Legenda dos estados de feedback.
 *
 * Existe para que ninguém precise **deduzir** o que as cores/signais significam.
 * Combina forma, símbolo e palavra — a mesma redundância das tiles.
 */
export function Legend({ language }: { language: Language }) {
  const strings = t(language);

  const items: Array<{ status: LetterStatus; label: string; className: string }> = [
    { status: 'correct', label: strings.legendCorrect, className: 'tile--correct' },
    { status: 'present', label: strings.legendPresent, className: 'tile--present' },
    { status: 'absent', label: strings.legendAbsent, className: 'tile--absent' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">
        {strings.legend}
      </span>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {items.map((item) => (
          <li key={item.status} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <span
              className={`tile ${item.className}`}
              style={{ '--tile-size': '1.4rem', fontSize: '0.7rem' } as React.CSSProperties}
              aria-hidden="true"
            >
              <span>{STATUS_SYMBOL[item.status]}</span>
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
