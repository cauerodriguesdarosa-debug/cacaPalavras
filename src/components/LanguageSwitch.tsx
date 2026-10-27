import { useRef } from 'react';
import type { Language } from '@/lib/types';
import { t } from '@/data/strings';

/**
 * Seletor de idioma.
 *
 * Usado como um grupo de botões (radio) em vez de um `<select>`: é mais rápido de
 * tocar em mobile e funciona melhor com leitores de tela, que anunciam o estado
 * "selecionado" automaticamente.
 *
 * Implementa o padrão ARIA completo de `radiogroup`: **tabindex móvel** (só o item
 * marcado está na ordem de tabulação) e navegação por setas, que movem a seleção.
 */
interface LanguageSwitchProps {
  language: Language;
  onChange: (language: Language) => void;
}

export function LanguageSwitch({ language, onChange }: LanguageSwitchProps) {
  const strings = t(language);
  const groupRef = useRef<HTMLDivElement>(null);

  const options: Array<{ value: Language; label: string }> = [
    { value: 'pt', label: 'PT' },
    { value: 'en', label: 'EN' },
  ];

  function moveSelection(direction: 1 | -1) {
    const current = options.findIndex((option) => option.value === language);
    const next = options[(current + direction + options.length) % options.length];
    onChange(next.value);
    // O foco acompanha a seleção, como manda o padrão.
    groupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
      ?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={strings.selectLanguage}
      className="inline-flex rounded-full border border-line bg-surface p-0.5"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          moveSelection(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveSelection(-1);
        }
      }}
    >
      {options.map((option) => {
        const active = option.value === language;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-value={option.value}
            aria-checked={active}
            // Padrão de tabindex móvel: só o item marcado é alcançável por Tab.
            tabIndex={active ? 0 : -1}
            // O nome acessível precisa ser o idioma por extenso: "EN" sozinho não
            // diz nada a um leitor de tela (e "PT" seria ambíguo entre português
            // de Portugal e do Brasil).
            aria-label={option.value === 'pt' ? strings.languagePt : strings.languageEn}
            onClick={() => onChange(option.value)}
            className={`min-h-11 min-w-11 rounded-full px-3 text-sm font-extrabold transition ${
              active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/5'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
