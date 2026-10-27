# AGENTS.md

Diretrizes para agentes de IA e contribuidores deste repositório.

## Projeto

**cacaPalavras** — jogo casual diário de adivinhação de palavras, web mobile-first,
público de crianças e jovens (8–18 anos). Sem cadastro obrigatório, sem monetização no MVP.

- Palavra do dia determinística por data (mesma para todos os usuários)
- Temas: animais, comida, ciência, esportes (comprimento variável por tema: 4–6 letras)
- Idiomas: pt-BR e en
- Feedback por letra: verde (posição correta) / amarelo (presente, fora de posição) / cinza (ausente),
  sempre **redundante em forma** (✓ / ↑ / ✗) — cor nunca é o único sinal
- Stack: React + Vite + TypeScript + Tailwind CSS

## Comandos

```bash
npm install          # instala dependências
npm run dev          # servidor de dev (http://localhost:5173)
npm run build        # build de produção
npm run preview      # serve o build
npm test             # testes (Vitest + Testing Library)
npm run test:watch   # testes em modo watch
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run verify:contrast   # mede contraste WCAG e volumetria do banco de palavras
npm run verify:ui         # verifica layout e acessibilidade em navegador real
npm run smoke             # percorre a jornada completa do jogador em navegador real
```

`verify:ui` roda contra o `preview` (precisa de `npm run build && npm run preview`).
`smoke` roda contra o `dev` (precisa de `npm run dev`) — é lá que a palavra do dia
pode ser lida de fora para percorrer a partida inteira.

## Acessibilidade é requisito, não extra

- Contraste: **WCAG 2.1 AA** (4,5:1 para texto, 3:1 para componentes e gráficos).
  Rode `npm run verify:contrast` — ele falha se algum par de cores da paleta reprovar.
- A cor **nunca** é o único canal: forma da tile + símbolo (✓ / ↑ / ✗) + `aria-label`.
- Todo texto visível na interface passa por `src/data/strings.ts`. Texto fixo em
  português no componente é bug — a auditoria já pegou um caso assim.
- Alvos de toque ≥ 44 px. `npm run verify:ui` checa isso e o scroll horizontal.

## Onde mexer o quê

| Mudança | Arquivos |
|---|---|
| regra de jogo, algoritmo, streak | `src/lib/` |
| palavra do dia, tema, i18n | `src/data/` |
| interface | `src/components/` |
| regra de estado da partida | `src/hooks/useGame.ts` |
| orquestração de telas | `src/App.tsx` |

## Convenções

- TypeScript strict. Sem `any` implícito; tipos explícitos em fronteiras de módulo.
- Funções puras para a lógica de jogo (feedback por letra, streak, seed do dia) — é o que é testado.
- Componentes de UI ficam em `src/components/`, lógica pura em `src/lib/`, dados em `src/data/`.
- Acessibilidade é requisito de aceite, não opcional: qualquer novo estado visual precisa de
  símbolo + `aria-label`, não apenas cor.
- Escreva comentários explicando **por quê**, não **o quê**.
- `npm run typecheck` cobre **tudo**, inclusive os testes. O build usa
  `tsconfig.build.json`, que exclui `src/test/` — um teste quebrado não pode impedir
  a build de produção.

## Regra de criação de PRDs

> Os PRDs devem ser _sempre_ criados na raiz do projeto atual, seguindo o formato
> `docs/plans/{{YYYY-MM-DD}}-{{descrição}}.md`.

O caminho é relativo à raiz do projeto atual. O placeholder `{{YYYY-MM-DD}}` deve ser a data
de criação do documento e `{{descrição}}` um slug curto em kebab-case descrevendo o PRD
(ex.: `2026-10-20-prd-jogo-adivinhacao-palavras.md`).

**Não** crie PRDs em outras pastas, com outros nomes ou dentro de subpastas de plano.
