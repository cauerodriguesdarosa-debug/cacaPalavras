import type { LetterStatus } from '@/lib/types';
import { t, format } from '@/data/strings';
import { STATUS_SYMBOL } from '@/lib/feedback';

/**
 * Uma letra da grade de feedback.
 *
 * Acessibilidade: a informação é transmitida por **três canais redundantes** —
 * forma da tile (arredondada / chanfrada / tracejada), símbolo (✓ / ↑ / ✗) e
 * `aria-label` descritivo. A cor é apenas a quarta camada, nunca a única.
 */

export type TileVisualStatus = LetterStatus | 'empty' | 'current';

interface TileProps {
  /** Letra exibida. Vazia nas tiles vazias. */
  letter: string;
  status: TileVisualStatus;
  /** Posição na palavra (1-based), usada no `aria-label`. */
  position: number;
  language: 'pt' | 'en';
  /** Aplica a animação de revelação (usada ao aplicar o feedback). */
  reveal?: boolean;
  /** Índice do atraso da animação, em ms. */
  delay?: number;
}

export function Tile({ letter, status, position, language, reveal = false, delay = 0 }: TileProps) {
  const strings = t(language);
  const style = delay ? ({ '--delay': `${delay}ms` } as React.CSSProperties) : undefined;

  // Tile vazia é só um espaço reservado: não carrega informação, então fica fora
  // da árvore de acessibilidade para não poluir a leitura com "Posição N: vazia".
  if (status === 'empty') {
    return (
      <div className="tile tile--empty" style={style} aria-hidden="true">
        <span aria-hidden="true">{letter}</span>
      </div>
    );
  }

  /*
   * Tile "atual": a letra que o jogador está digitando agora.
   *
   * Ela é o conteúdo mais importante da tela naquele instante — mais do que o
   * feedback das linhas anteriores. Por isso usa o contraste máximo (`ink`), e não
   * a cor suave das linhas ainda vazias.
   *
   * Também precisa ser visível ao **leitor de tela**: sem `role` e `aria-label`,
   * a letra estava fora da árvore de acessibilidade, e quem digita pelo teclado
   * físico não recebia nenhuma confirmação do que escreveu.
   */
  if (status === 'current') {
    return (
      <div
        className="tile tile--current"
        style={style}
        role="img"
        aria-label={format(strings.tileLabelCurrent, {
          pos: position,
          letter: letter.toUpperCase(),
        })}
      >
        <span aria-hidden="true">{letter}</span>
      </div>
    );
  }

  const statusClass =
    status === 'correct' ? 'tile--correct' : status === 'present' ? 'tile--present' : 'tile--absent';

  const symbol = STATUS_SYMBOL[status];

  const label =
    status === 'correct'
      ? format(strings.tileLabelCorrect, { pos: position, letter: letter.toUpperCase() })
      : status === 'present'
        ? format(strings.tileLabelPresent, { pos: position, letter: letter.toUpperCase() })
        : format(strings.tileLabelAbsent, { pos: position, letter: letter.toUpperCase() });

  return (
    <div
      className={`tile ${statusClass} ${reveal ? 'tile--reveal' : ''}`}
      style={style}
      role="img"
      aria-label={label}
    >
      <span aria-hidden="true">{letter}</span>
      <span className="tile__symbol" aria-hidden="true">
        {symbol}
      </span>
    </div>
  );
}
