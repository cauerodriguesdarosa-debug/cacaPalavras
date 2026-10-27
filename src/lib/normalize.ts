/**
 * Normalização de texto.
 *
 * O teclado virtual do jogo não tem teclas de acento. Para que o jogador nunca fique
 * preso tentando digitar "maçã", toda comparação entre tentativa e resposta acontece
 * sobre a forma normalizada: sem diacríticos, em minúsculas.
 */

/**
 * Remove acentos e cedilha, converte para minúsculas e colapsa espaços.
 *
 * `maçã` -> `maca`, `TÊNIS` -> `tenis`, `Célula` -> `celula`.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    // Combina os diacríticos Unicode: c-cedilha vira "c" + U+0327, a-til vira "a" + U+0303.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Verifica se um texto é composto apenas de letras ASCII (sem acento, cedilha, número ou símbolo). */
export function isPlainLetters(input: string): boolean {
  return /^[a-z]+$/.test(input);
}
