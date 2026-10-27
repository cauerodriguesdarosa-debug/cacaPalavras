import type { ThemeId } from '@/lib/types';

/**
 * Ilustração do tema do dia.
 *
 * SVG original, desenhado com formas simples em vez de emoji: o emoji é renderizado
 * diferente em cada sistema e não aceita a cor do tema. O SVG herda `currentColor` e
 * as custom properties do tema, então a ilustração **repinta junto** com a paleta.
 *
 * As formas são deliberadamente chapadas (flat) e de traço grosso: precisam ser
 * legíveis a 56 px em tela de celular.
 */
export function ThemeIllustration({ themeId, size = 56 }: { themeId: ThemeId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true as const,
    focusable: 'false' as const,
  };

  switch (themeId) {
    case 'animals':
      return (
        <svg {...common}>
          {/* Pegada: quatro dedos e uma almofada. */}
          <ellipse cx="32" cy="44" rx="15" ry="12" fill="var(--theme-primary)" />
          <ellipse cx="13" cy="27" rx="5" ry="7" fill="var(--theme-primary)" />
          <ellipse cx="24" cy="17" rx="5" ry="7" fill="var(--theme-primary)" />
          <ellipse cx="40" cy="17" rx="5" ry="7" fill="var(--theme-primary)" />
          <ellipse cx="51" cy="27" rx="5" ry="7" fill="var(--theme-primary)" />
          <ellipse cx="32" cy="44" rx="8" ry="6" fill="var(--theme-accent)" />
        </svg>
      );

    case 'food':
      return (
        <svg {...common}>
          {/* Fatia de pizza. */}
          <path d="M32 8 L56 50 A26 26 0 0 1 8 50 Z" fill="var(--theme-accent)" />
          <path d="M32 8 L56 50 A26 26 0 0 1 8 50 Z" fill="var(--theme-primary)" opacity="0.18" />
          <circle cx="28" cy="34" r="5" fill="var(--theme-primary)" />
          <circle cx="39" cy="42" r="4" fill="var(--theme-primary)" />
          <circle cx="26" cy="45" r="3.5" fill="var(--theme-primary)" />
          <path d="M32 8 L40 22 L24 22 Z" fill="var(--theme-primary)" opacity="0.5" />
        </svg>
      );

    case 'science':
      return (
        <svg {...common}>
          {/* Frasco de laboratório. */}
          <path
            d="M26 8h12v14l14 24a8 8 0 0 1-7 12H19a8 8 0 0 1-7-12l14-24Z"
            fill="var(--theme-primary)"
            opacity="0.22"
          />
          <path
            d="M26 8h12v14l14 24a8 8 0 0 1-7 12H19a8 8 0 0 1-7-12l14-24Z"
            stroke="var(--theme-primary)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M17 42h30l5 9a8 8 0 0 1-7 11H19a8 8 0 0 1-7-11Z" fill="var(--theme-primary)" />
          <circle cx="27" cy="50" r="3" fill="var(--theme-accent)" />
          <circle cx="37" cy="55" r="2.2" fill="var(--theme-accent)" />
          <rect x="24" y="4" width="16" height="6" rx="3" fill="var(--theme-primary)" />
        </svg>
      );

    case 'sports':
      return (
        <svg {...common}>
          {/* Bola com gomos. */}
          <circle cx="32" cy="32" r="25" fill="var(--theme-primary)" />
          <path d="M32 32 L32 7 A25 25 0 0 1 53.65 19.5 Z" fill="var(--theme-accent)" />
          <path d="M32 32 L10.35 44.5 A25 25 0 0 1 10.35 19.5 Z" fill="var(--theme-accent)" />
          <circle cx="32" cy="32" r="25" stroke="var(--theme-primary)" strokeWidth="4" />
          <path
            d="M32 7v25M10.35 19.5l21.65 12.5M53.65 19.5 32 32M32 57V32m-21.65 12.5L32 32"
            stroke="var(--theme-primary)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
