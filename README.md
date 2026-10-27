# cacaPalavras

Jogo casual diário de adivinhação de palavras. Web mobile-first, para público de
crianças e jovens (8–18 anos). Uma palavra por dia, por tema, com sequência,
estatísticas e compartilhamento sem revelar a solução.

Sem cadastro. Sem back-end. Sem monetização no MVP.

## Como iniciar o jogo (Linux)

**Não abra `index.html` com dois cliques.** Este é um projeto React + Vite e precisa do servidor local para carregar. Se você abrir o arquivo diretamente, ele agora mostra esta instrução em vez de ficar parecendo uma tela branca.

Forma mais fácil: abra um terminal nesta pasta e execute:

```bash
npm install
npm run dev -- --open
```

Ou execute `INICIAR-JOGO.sh` em um terminal. Na primeira execução, a instalação precisa de internet. Mantenha a janela do terminal aberta enquanto joga.

## Como jogar

1. A palavra do dia é escolhida pelo **tema do dia** (animais, comida, ciência ou esportes).
2. Você tem **6 tentativas** por desafio.
3. Cada tentativa devolve o feedback por letra:

   | Símbolo | Significado | Forma da tile |
   |---|---|---|
   | ✓ | a letra está **na posição certa** | cantos arredondados |
   | ↑ | a letra existe, mas **em outra posição** | canto chanfrado |
   | ✗ | a letra **não existe** na palavra | contorno tracejado |

4. O teclado virtual guarda a memória das letras: o que já ficou cinza não volta a
   ser usado, e o que ficou verde continua verde.
5. Acertou? A palavra é revelada com a acentuação original e o resultado pode ser
   compartilhado — **sem revelar a resposta**.

Existe também o **modo treino**, que não gasta o jogo do dia nem quebra sua sequência.

## Recursos

- **Dois idiomas** — português (Brasil) e inglês, com seletor na tela inicial.
- **Acessibilidade WCAG 2.1 AA** — a cor nunca é o único sinal: forma, símbolo e
  `aria-label` carregam a informação; navegação completa por teclado; regiões
  `aria-live`; foco visível; `prefers-reduced-motion` respeitado.
- **Palavra do dia determinística** — a mesma para todas as pessoas, sem servidor.
- **Persistência local** — sequência, estatísticas e histórico no `localStorage`,
  com botão "Apagar meus dados" na tela de estatísticas.
- **Funciona offline** — service worker com cache do app shell; instalável como PWA.
- **Modo treino** — joga outra palavra do mesmo tema, sem gastar o jogo do dia nem
  quebrar a sequência. Nunca usa a palavra oficial, para não permitir spoilerizar
  o desafio.

## Stack

React 19 · Vite 6 · TypeScript (strict) · Tailwind CSS 4 · Vitest + Testing Library

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/
npm run preview    # serve o build
npm test           # testes
npm run test:watch
npm run lint
npm run typecheck
npm run verify:contrast   # contraste WCAG e volumetria do banco de palavras
npm run verify:ui         # layout, alvos de toque e offline em navegador real
```

`verify:ui` precisa do app servindo (`npm run build && npm run preview`) e do Chrome
do sistema. As duas ferramentas de verificação existem para que os números citados
na documentação sejam **reproduzíveis**, e não estimativas.

## Documentos

| Documento | Caminho |
|---|---|
| PRD | [`docs/plans/2026-10-20-prd-jogo-adivinhacao-palavras.md`](docs/plans/2026-10-20-prd-jogo-adivinhacao-palavras.md) |
| Documento de projeto técnico | [`docs/2026-10-20-documento-projeto-tecnico.md`](docs/2026-10-20-documento-projeto-tecnico.md) |
| Protótipos (galeria) | [`prototypes/index.html`](prototypes/index.html) |

Abra `prototypes/index.html` no navegador para comparar os três conceitos de
interface lado a lado.

## Estrutura

```
src/
  lib/         lógica pura e testável (feedback, seed do dia, streak, compartilhamento)
  data/        conteúdo: temas, textos i18n, banco de palavras
  components/  interface React
  hooks/       estado da partida e persistência
  test/        testes unitários e de integração
```

Ver [`AGENTS.md`](AGENTS.md) para as diretrizes de contribuição.

## Publicação no GitHub Pages

O projeto está configurado para o repositório `cacaPalavras` em GitHub Pages (`base: '/cacaPalavras/'`). O workflow `.github/workflows/deploy.yml` compila e publica automaticamente ao enviar para `main` ou `master`. Em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação. Depois acompanhe a execução em **Actions**.
