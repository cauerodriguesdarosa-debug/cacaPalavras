import type { Language, LetterStatus } from '@/lib/types';
import { t, format } from '@/data/strings';
import { STATUS_SYMBOL } from '@/lib/feedback';

/**
 * Teclado virtual.
 *
 * Além da digitação, o teclado carrega a **memória do jogo**: cada tecla guarda o
 * melhor status que a letra já teve (verde > amarelo > cinza). É a mesma linguagem
 * de forma das tiles, então a leitura é consistente.
 *
 * Teclas cinza ficam desabilitadas — o jogador não precisa (nem deve) reusar uma
 * letra que já provou não existir.
 */

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const;

interface KeyboardProps {
  language: Language;
  /** Estado de cada letra, indexado pela letra minúscula. */
  keyState: Record<string, LetterStatus>;
  /** Desabilita o teclado inteiro (partida encerrada). */
  disabled: boolean;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitLabel: string;
  backspaceLabel: string;
  submitDisabled?: boolean;
}

export function Keyboard({
  language,
  keyState,
  disabled,
  onLetter,
  onBackspace,
  onSubmit,
  submitLabel,
  backspaceLabel,
  submitDisabled = false,
}: KeyboardProps) {
  const strings = t(language);

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={strings.keyboardLabel}>
      {/* As duas primeiras fileiras ficam centradas; a terceira é montada à parte,
          porque carrega os botões "enviar" e "apagar". */}
      {ROWS.slice(0, 2).map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex justify-center gap-1"
          // A segunda fileira é levemente deslocada, como em um teclado físico.
          style={rowIndex === 1 ? { paddingInline: '0.9rem' } : undefined}
        >
          {row.map((letter) => (
            <LetterKey
              key={letter}
              letter={letter}
              language={language}
              status={keyState[letter]}
              disabled={disabled}
              onPress={onLetter}
            />
          ))}
        </div>
      ))}

      <div className="flex gap-1">
        <button
          type="button"
          className="key key--wide btn--primary"
          style={{ background: 'var(--theme-primary-d, #16202a)' }}
          onClick={onSubmit}
          disabled={disabled || submitDisabled}
          aria-label={submitLabel}
        >
          {submitLabel}
        </button>

        {ROWS[2].map((letter) => (
          <LetterKey
            key={letter}
            letter={letter}
            language={language}
            status={keyState[letter]}
            disabled={disabled}
            onPress={onLetter}
          />
        ))}

        <button
          type="button"
          className="key key--wide"
          onClick={onBackspace}
          disabled={disabled}
          aria-label={backspaceLabel}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M21 5H9L3 12l6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" strokeLinejoin="round" />
            <path d="m16 9-5 6M11 9l5 6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="sr-only" lang={language}>
        {strings.keyboardHint}
      </p>
    </div>
  );
}

/**
 * Uma tecla de letra.
 *
 * Existe como componente único (usado nas **três** fileiras) para que o estado da
 * letra seja sempre comunicado pelos mesmos três canais: **símbolo**, `aria-label`
 * descritivo e forma/cor. Antes, a terceira fileira era renderizada à parte e ficava
 * sem símbolo — o estado de 7 letras dependia só da cor.
 */
function LetterKey({
  letter,
  language,
  status,
  disabled,
  onPress,
}: {
  letter: string;
  language: Language;
  status: LetterStatus | undefined;
  disabled: boolean;
  onPress: (letter: string) => void;
}) {
  const strings = t(language);
  const absent = status === 'absent';

  return (
    <button
      type="button"
      className={`key flex-1 ${
        status === 'correct'
          ? 'key--correct'
          : status === 'present'
            ? 'key--present'
            : absent
              ? 'key--absent'
              : ''
      }`}
      // Letra já provada ausente: desabilitada, mas continua visível.
      disabled={disabled || absent}
      onClick={() => onPress(letter)}
      aria-label={
        absent ? format(strings.keyAbsentLabel, { letter: letter.toUpperCase() }) : letter.toUpperCase()
      }
    >
      {letter}
      {status ? (
        <span className="key__symbol" aria-hidden="true">
          {STATUS_SYMBOL[status]}
        </span>
      ) : null}
    </button>
  );
}
