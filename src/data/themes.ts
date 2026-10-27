import type { Language, ThemeId } from '@/lib/types';

/**
 * Definição dos temas do MVP.
 *
 * O tema define o **comprimento** da palavra, e portanto o número de tentativas
 * (6 para 4 letras, 7 para 5–6). A ordem do array é a ordem de rotação usada pelo
 * gerador determinístico — mudar esta ordem muda o histórico de palavras já jogadas.
 */
export interface Theme {
  id: ThemeId;
  /** Comprimento da palavra, em letras. */
  length: number;
  /** Emoji/ícone representativo, usado como marcador visual do tema. */
  icon: string;
  /** Cores do tema aplicadas via CSS custom properties (modo visual). */
  palette: {
    /** Cor de marca: cenário, ilustração, detalhes. Não vai atrás de texto branco. */
    primary: string;
    /** Variante escura: fundo de botões e faixas com texto branco (≥ 4,5:1). */
    dark: string;
    accent: string;
    surface: string;
  };
}

/** Ordem fixa de rotação dos temas. */
export const THEME_IDS = ['animals', 'food', 'science', 'sports'] as const;

export const THEMES: Record<ThemeId, Theme> = {
  animals: {
    id: 'animals',
    length: 5,
    icon: '🐾',
    palette: { primary: '#2f9e6b', dark: '#1e6f4b', accent: '#ffd166', surface: '#e9f7ef' },
  },
  food: {
    id: 'food',
    length: 4,
    icon: '🍎',
    palette: { primary: '#e4572e', dark: '#a53a18', accent: '#ffb703', surface: '#fdefe7' },
  },
  science: {
    id: 'science',
    length: 6,
    icon: '🔬',
    palette: { primary: '#3d5afe', dark: '#2b3fc4', accent: '#8e44ad', surface: '#eceffd' },
  },
  sports: {
    id: 'sports',
    length: 5,
    icon: '⚽',
    palette: { primary: '#1b6ca8', dark: '#0f4a73', accent: '#00b4d8', surface: '#e6f2fa' },
  },
};

/** Rótulos do tema por idioma. */
export const THEME_LABELS: Record<Language, Record<ThemeId, string>> = {
  pt: {
    animals: 'Animais',
    food: 'Comida',
    science: 'Ciência',
    sports: 'Esportes',
  },
  en: {
    animals: 'Animals',
    food: 'Food',
    science: 'Science',
    sports: 'Sports',
  },
};
