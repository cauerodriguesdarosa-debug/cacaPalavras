import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { getTodayPuzzle, getPracticePuzzle } from '@/lib/daily';
import { guessSet } from '@/data/words';

/**
 * Teste de integração do fluxo principal.
 *
 * A palavra do dia é resolvida pelo mesmo código que o app usa, então o teste
 * conhece a resposta sem depender do conteúdo curado — e a invariante de que a
 * resposta é sempre jogável (rede de segurança em `src/data/words/index.ts`) faz
 * parte do que está sendo verificado aqui.
 */
afterEach(() => {
  vi.useRealTimers();
});

describe('fluxo principal do jogo', () => {
  it('leva o jogador da tela inicial até a vitória', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');

    render(<App />);

    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    // A grade e o teclado estão presentes na tela de partida.
    expect(screen.getByText(/tentativas restantes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apagar/i })).toBeInTheDocument();

    for (const letter of puzzle.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }

    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    expect(await screen.findByRole('heading', { name: /você acertou/i })).toBeInTheDocument();
    // A palavra é revelada ao final, com a acentuação original — na tela e
    // também na região viva (que é o que o leitor de tela anuncia).
    expect(screen.getAllByText(new RegExp(puzzle.answer, 'i')).length).toBeGreaterThan(0);
  });

  it('rejeita palavra inexistente sem consumir tentativa', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');
    const invalid = 'qzxj'.slice(0, puzzle.length).padEnd(puzzle.length, 'q');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    for (const letter of invalid) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não existe/i);
    // O número de tentativas continua o mesmo: a tentativa inválida não contou.
    expect(screen.getByText(/tentativas restantes/i)).toHaveTextContent(
      String(6),
    );
  });

  it('anuncia o resultado da tentativa em uma região viva', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');
    const guess = [...(guessSet('pt', puzzle.length) ?? [])][0];

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    // Uma tentativa qualquer: o anúncio descreve a linha.
    for (const letter of guess) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    const live = await screen.findByRole('status');
    expect(live.textContent).toMatch(/linha 1/i);
  });

  it('anuncia o resultado final na região viva, não só a última linha', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    for (const letter of puzzle.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await screen.findByRole('heading', { name: /você acertou/i });

    // Quem usa leitor de tela precisa ouvir o resultado, não só a última linha.
    const live = screen.getByRole('status');
    expect(live.textContent).toMatch(/você acertou/i);
    expect(live.textContent).toContain(puzzle.answer);
  });

  /**
   * Regressão: o registro do dia precisa ser finalizado quando a partida termina.
   *
   * Sem isso, a tela inicial continuava oferecendo "Jogar" depois da vitória, o
   * jogador repetia a partida do dia e as estatísticas (partidas, vitórias,
   * distribuição de tentativas) ficavam infladas.
   */
  it('não permite repetir a partida do dia nem inflar as estatísticas', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    for (const letter of puzzle.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await screen.findByRole('heading', { name: /você acertou/i });

    // Volta para o início: o jogo do dia está concluído.
    await user.click(screen.getByRole('button', { name: /início/i }));
    expect(screen.getByText(/você já jogou hoje/i)).toBeInTheDocument();
    // O botão principal passa a ser o treino — não há mais como jogar o dia de novo.
    expect(screen.queryByRole('button', { name: /^jogar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /treinar/i })).toBeInTheDocument();

    // As estatísticas contaram exatamente uma partida.
    // A gravação em `localStorage` é debounced (150 ms), então é preciso esperar.
    await waitFor(() => {
      const raw = localStorage.getItem('cacaPalavras:v1');
      const saved = JSON.parse(raw ?? '{}') as { stats?: { games?: number; wins?: number } };
      expect(saved.stats?.games).toBe(1);
      expect(saved.stats?.wins).toBe(1);
    });
  });

  /**
   * O modo treino joga **outra** palavra, não a do dia.
   *
   * Quando o treino usava a palavra oficial, ele permitia spoilerizar o desafio
   * diário: o jogador descobria a resposta no treino e vencia a partida oficial na
   * primeira tentativa, o que zerava o desafio e distorcia as métricas do PRD (§ 17).
   */
  it('o modo treino usa uma palavra diferente da palavra do dia', () => {
    const daily = getTodayPuzzle('pt');
    const practice = getPracticePuzzle(new Date(), 'pt', 0);
    expect(practice.answer).not.toBe(daily.answer);
    // Mas mantém o tema e o comprimento, para que a prática seja comparável.
    expect(practice.themeId).toBe(daily.themeId);
    expect(practice.length).toBe(daily.length);
  });

  /**
   * Regressão: a tela de resultado do treino precisa mostrar **a palavra que foi
   * jogada**.
   *
   * Concluir um treino avança o índice de palavras do treino, o que recalcula o
   * quebra-cabeça no `App`. Se a sessão de jogo continuasse lendo a palavra
   * "ao vivo", a tela de resultado passaria a anunciar a *próxima* palavra do
   * treino — e o texto compartilhado sairia com o número do dia errado.
   */
  it('a tela de resultado do treino mostra a palavra que foi jogada', async () => {
    const user = userEvent.setup();
    const practice = getPracticePuzzle(new Date(), 'pt', 0);

    render(<App />);
    await user.click(screen.getByRole('button', { name: /treinar/i }));
    for (const letter of practice.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await screen.findByRole('heading', { name: /você acertou/i });

    // A palavra revelada tem de ser a jogada — e não a seguinte do treino.
    expect(screen.getAllByText(new RegExp(practice.answer, 'i')).length).toBeGreaterThan(0);
  });

  it('o modo treino não altera o streak nem as estatísticas', async () => {
    const user = userEvent.setup();
    const practice = getPracticePuzzle(new Date(), 'pt', 0);

    render(<App />);
    await user.click(screen.getByRole('button', { name: /treinar/i }));
    for (const letter of practice.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await screen.findByRole('heading', { name: /você acertou/i });

    await waitFor(() => {
      const raw = localStorage.getItem('cacaPalavras:v1');
      const saved = JSON.parse(raw ?? '{}') as {
        stats?: { games?: number; wins?: number; currentStreak?: number };
      };
      // As estatísticas existem, mas continuam zeradas: o treino não conta.
      expect(saved.stats?.games).toBe(0);
      expect(saved.stats?.wins).toBe(0);
      expect(saved.stats?.currentStreak).toBe(0);
    });
  });

  it('restaura a partida em andamento depois de recarregar', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');
    const key = 'cacaPalavras:v1';

    // Uma tentativa **válida** (o dicionário rejeita palavra inexistente).
    const guess = [...(guessSet('pt', puzzle.length) ?? [])][0];

    const first = render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    for (const letter of guess) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(key) ?? '{}').daily).toBeTruthy();
    });
    first.unmount();

    // Recarrega: a tentativa deve **voltar para a grade**. Verificar só o
    // `localStorage` seria tautológico — passaria mesmo com todo o mecanismo de
    // restauração removido.
    const second = render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    await waitFor(() => {
      const tiles = second.container.querySelectorAll('[role="listitem"] [role="img"]');
      expect(tiles.length).toBe(guess.length);
      // A primeira tile da linha restaurada carrega o rótulo descritivo.
      expect(tiles[0]?.getAttribute('aria-label')).toMatch(/^Posição 1:/);
    });
  });

  it('apagar meus dados zera as estatísticas', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    for (const letter of puzzle.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await screen.findByRole('heading', { name: /você acertou/i });

    await user.click(screen.getByRole('button', { name: /início/i }));
    await user.click(screen.getByRole('button', { name: /estatísticas/i }));
    // Antes de apagar, há uma vitória registrada.
    expect(screen.getByText('Vitórias')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /apagar meus dados/i }));
    await user.click(screen.getByRole('button', { name: /apagar tudo/i }));

    // Volta para a tela inicial com tudo zerado.
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('cacaPalavras:v1') ?? '{}');
      expect(saved.stats?.games ?? 0).toBe(0);
      expect(saved.stats?.wins ?? 0).toBe(0);
      expect(saved.stats?.currentStreak ?? 0).toBe(0);
    });
  });

  it('a grade tem exatamente o número de linhas do limite de tentativas', async () => {
    const user = userEvent.setup();
    const expected = 6;

    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    // As linhas vazias são `aria-hidden` (são apenas espaços reservados), então
    // a contagem é feita no DOM, e não por papel ARIA.
    const grid = container.querySelector('[role="list"]');
    expect(grid).not.toBeNull();
    expect(grid?.children).toHaveLength(expected);
  });

  it('distingue dias jogados de partidas', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    for (const letter of puzzle.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    await screen.findByRole('heading', { name: /você acertou/i });

    await user.click(screen.getByRole('button', { name: /início/i }));
    await user.click(screen.getByRole('button', { name: /estatísticas/i }));

    // Uma partida, um dia.
    expect(screen.getByText('Dias jogados')).toBeInTheDocument();
    expect(screen.getByText('Partidas')).toBeInTheDocument();
  });

  it('sobrevive a um localStorage corrompido', () => {
    // Extensão de navegador ou escrita interrompida podem deixar lixo no storage.
    localStorage.setItem(
      'cacaPalavras:v1',
      JSON.stringify({
        version: 1,
        language: 'pt',
        stats: { games: 'muito', guessDistribution: 'não é array', currentStreak: null },
        daily: 'também não é um objeto',
      }),
    );

    render(<App />);
    // O app abre e a tela inicial aparece — sem exceção.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^jogar$/i })).toBeInTheDocument();
  });

  /**
   * A virada do dia é a premissa do produto: "uma palavra por dia".
   *
   * Sem detectar a mudança de data, uma aba aberta durante a noite continua
   * servindo a palavra de ontem — com o número do dia congelado, o registro
   * gravado na data errada e o streak que nunca avança.
   */
  it('troca a palavra do dia quando o dia vira com a aba aberta', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 22, 23, 59, 50));

    render(<App />);

    const antes = screen.getByText(/palavra do dia nº/i).textContent;
    expect(antes).toBeTruthy();

    // Cruza a meia-noite.
    vi.setSystemTime(new Date(2026, 9, 23, 0, 0, 10));
    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    const depois = screen.getByText(/palavra do dia nº/i).textContent;
    expect(depois).not.toBe(antes);
  });

  it('move o foco para o título da tela ao trocar de tela', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^jogar$/i }));

    // O foco não pode ficar no <body>: quem navega por teclado ficaria sem
    // qualquer indicação de que a tela mudou.
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement?.tagName).toBe('H1');
    });
  });

  it('não envia a tentativa duas vezes ao pressionar Enter com o botão em foco', async () => {
    const user = userEvent.setup();
    const puzzle = getTodayPuzzle('pt');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /^jogar$/i }));
    for (const letter of puzzle.normalizedAnswer) {
      await user.click(screen.getByRole('button', { name: letter.toUpperCase() }));
    }

    const submit = screen.getByRole('button', { name: /^jogar$/i });
    submit.focus();
    await user.keyboard('{Enter}');

    // Uma única submissão: a tela de resultado aparece, sem erro de "vazio".
    expect(await screen.findByRole('heading', { name: /você acertou/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
