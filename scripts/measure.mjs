/**
 * Medidor de contraste WCAG 2.1 e de volumetria do banco de palavras.
 *
 * Existe para que os números citados na documentação técnica sejam
 * **reproduzíveis** e não estimativas. Rodar: `node scripts/measure.mjs`
 */

const hex = (value) => {
  const clean = value.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

/** Luminância relativa (WCAG 2.1). */
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Razão de contraste entre duas cores. */
const contrast = (a, b) => {
  const l1 = luminance(hex(a));
  const l2 = luminance(hex(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

// ── Paleta do produto ────────────────────────────────────────────────────────
const PAGE = '#f4f6f8';
const SURFACE = '#ffffff';

const tokens = {
  'ink (#16202a)': '#16202a',
  'ink-soft (#55636f)': '#55636f',
  'ink-faint (#65727d)': '#65727d',
  'line (#d9e0e6)': '#d9e0e6',
  'correct (#2a8053)': '#2a8053',
  'present (#e0a11b)': '#e0a11b',
  'absent-ink (#5d6a76)': '#5d6a76',
  'absent-border (#7e8b97)': '#7e8b97',
  'theme animals (#2f9e6b)': '#2f9e6b',
  'theme animals dark (#1e6f4b)': '#1e6f4b',
  'theme food (#e4572e)': '#e4572e',
  'theme food dark (#a53a18)': '#a53a18',
  'theme science (#3d5afe)': '#3d5afe',
  'theme science dark (#2b3fc4)': '#2b3fc4',
  'theme sports (#1b6ca8)': '#1b6ca8',
  'theme sports dark (#0f4a73)': '#0f4a73',
};

const checks = [
  ['ink sobre page', '#16202a', PAGE, 4.5],
  ['ink-soft sobre page', '#55636f', PAGE, 4.5],
  ['ink-faint sobre page', '#65727d', PAGE, 4.5],
  ['ink sobre surface', '#16202a', SURFACE, 4.5],
  ['ink-soft sobre surface', '#55636f', SURFACE, 4.5],
  ['ink-faint sobre surface', '#65727d', SURFACE, 4.5],
  ['letra tile correta (branco sobre correct)', '#ffffff', '#2a8053', 4.5],
  ['letra tile presente (ink sobre present)', '#1b2430', '#e0a11b', 4.5],
  ['simbolo ausente (absent-ink sobre page)', '#5d6a76', PAGE, 4.5],
  ['borda tracejada (absent-border sobre page)', '#7e8b97', PAGE, 3],
  ['borda tracejada (absent-border sobre surface)', '#7e8b97', SURFACE, 3],
  ['botão primário animals', '#ffffff', '#1e6f4b', 4.5],
  ['botão primário food', '#ffffff', '#a53a18', 4.5],
  ['botão primário science', '#ffffff', '#2b3fc4', 4.5],
  ['botão primário sports', '#ffffff', '#0f4a73', 4.5],
  ['faixa de streak (branco sobre animals)', '#ffffff', '#1e6f4b', 4.5],
  ['faixa de streak (branco sobre food)', '#ffffff', '#a53a18', 4.5],
  ['faixa de streak (branco sobre science)', '#ffffff', '#2b3fc4', 4.5],
  ['faixa de streak (branco sobre sports)', '#ffffff', '#0f4a73', 4.5],
  ['nome do tema animals (dark sobre page)', '#1e6f4b', PAGE, 4.5],
  ['nome do tema food (dark sobre page)', '#a53a18', PAGE, 4.5],
  ['nome do tema science (dark sobre page)', '#2b3fc4', PAGE, 4.5],
  ['nome do tema sports (dark sobre page)', '#0f4a73', PAGE, 4.5],
  // A cor de marca não é usada como texto em lugar nenhum — só como preenchimento
  // de gráfico (ilustração do tema), onde vale 3:1 contra a superfície do tema.
  ['ilustração animals sobre surface', '#2f9e6b', '#e9f7ef', 3],
  ['ilustração food sobre surface', '#e4572e', '#fdefe7', 3],
  ['ilustração science sobre surface', '#3d5afe', '#eceffd', 3],
  ['ilustração sports sobre surface', '#1b6ca8', '#e6f2fa', 3],
  // Símbolos de estado (✓ ↑ ✗) —/info adicional redundante com a forma, mas
  // ainda é texto visível e precisa de contraste.
  ['símbolo ✓ da tile/tecla correta', '#ffffff', '#2a8053', 4.5],
  ['símbolo ↑ da tile/tecla presente', '#4a3708', '#e0a11b', 4.5],
  ['símbolo ✗ da tile/tecla ausente', '#5d6a76', PAGE, 4.5],
  // Letra que está sendo digitada: o conteúdo mais importante da tela.
  ['letra atual (ink sobre surface)', '#16202a', SURFACE, 4.5],
  // Textos auxiliares sobre a superfície colorida do tema.
  ['ink-soft sobre surface do tema animais', '#55636f', '#e9f7ef', 4.5],
  ['ink-soft sobre surface do tema comida', '#55636f', '#fdefe7', 4.5],
  ['ink-soft sobre surface do tema ciência', '#55636f', '#eceffd', 4.5],
  ['ink-soft sobre surface do tema esportes', '#55636f', '#e6f2fa', 4.5],
];

console.log('=== CONTRASTE WCAG 2.1 ===');
let failures = 0;
for (const [label, fg, bg, min] of checks) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failures += 1;
  console.log(
    `${ok ? 'OK  ' : 'FALHA'} ${ratio.toFixed(2).padStart(5)}:1  (mín ${min}:1)  ${label}`,
  );
}
console.log(`\n${failures} falha(s) de contraste.`);

// ── Volumetria do banco de palavras ──────────────────────────────────────────
const { readFileSync } = await import('node:fs');
const { resolve, dirname } = await import('node:path');
const { fileURLToPath } = await import('node:url');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

console.log('\n=== VOLUMETRIA DO BANCO DE PALAVRAS ===');
for (const lang of ['pt', 'en']) {
  const source = readFileSync(resolve(root, `src/data/words/${lang}.ts`), 'utf8');
  const answersBlock = source.slice(
    source.indexOf('export const answers'),
    source.indexOf('export const guesses'),
  );
  const themes = {};
  for (const theme of ['animals', 'food', 'science', 'sports']) {
    const m = answersBlock.match(new RegExp(`${theme}:\\s*\\[([\\s\\S]*?)\\]`));
    themes[theme] = m ? (m[1].match(/'[^']+'/g) ?? []).length : 0;
  }
  const guessesBlock = source.slice(source.indexOf('export const guesses'));
  const guesses = {};
  for (const len of [4, 5, 6]) {
    const m = guessesBlock.match(new RegExp(`\\n  ${len}:\\s*\\[([\\s\\S]*?)\\]`));
    guesses[len] = m ? (m[1].match(/'[^']+'/g) ?? []).length : 0;
  }
  const totalAnswers = Object.values(themes).reduce((a, b) => a + b, 0);
  const totalGuesses = Object.values(guesses).reduce((a, b) => a + b, 0);
  console.log(
    `${lang}: answers ${Object.entries(themes)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')} (total ${totalAnswers}) | guesses ${Object.entries(guesses)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')} (total ${totalGuesses}) | palavras ${totalAnswers + totalGuesses}`,
  );
}
