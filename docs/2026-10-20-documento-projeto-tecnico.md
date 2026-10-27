# Documento de Projeto Técnico — cacaPalavras

| Campo | Valor |
|---|---|
| Produto | Jogo casual diário de adivinhação de palavras |
| Documento | Especificação de implementação do MVP (v1) |
| Data | 2026-10-20 |
| PRD de referência | `docs/plans/2026-10-20-prd-jogo-adivinhacao-palavras.md` |
| Protótipos | `prototypes/index.html` (Conceitos A, B, C) |

---

## 1. Sumário

1. Visão geral da arquitetura
2. Stack e justificativa das escolhas
3. Estrutura de diretórios
4. Modelo de dados
5. Algoritmos
6. Banco de palavras
7. Internacionalização
8. Design escolhido e sistema visual
9. Componentes de interface
10. Fluxo de dados e máquina de estados
11. Acessibilidade como requisito de arquitetura
12. Estratégia de testes
13. Performance e bundle
14. Privacidade e segurança
15. Deploy
16. Riscos técnicos
17. Roadmap técnico
18. Apêndice A — decisões técnicas (ADR resumido)

---

## 2. Visão geral da arquitetura

O produto é uma **aplicação web estática, sem back-end**. Toda a inteligência do jogo
reside no cliente:

```
┌──────────────────────────────────────────────────────────────┐
│                      NAVEGADOR                                │
│                                                               │
│  ┌────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│  │  Date +    │   │  Word list   │   │  localStorage     │  │
│  │  Language  │   │  (bundled)   │   │  (stats + jogo)   │  │
│  └─────┬──────┘   └──────┬───────┘   └─────────┬─────────┘  │
│        │                 │                     │            │
│        └────────┬────────┴─────────────────────┘            │
│                 ▼                                          │
│        ┌─────────────────┐        ┌────────────────────┐   │
│        │  src/lib (puro) │◀──────▶│  src/components    │   │
│        │  seed · feedback│        │  (React)           │   │
│        │  streak · share │        └────────────────────┘   │
│        └─────────────────┘                                   │
└──────────────────────────────────────────────────────────────┘
```

Três consequências dessa escolha:

- **A palavra do dia é derivada da data**, não buscada. Dois jogadores em fusos
  diferentes, em dispositivos diferentes, veem a mesma palavra. Requisito de negócio
  (PRD § 8.1) resolvido sem servidor.
- **Não há conta, token, sessão ou chamada de rede** em runtime. O produto abre
  offline e funciona offline.
- **O conteúdo (banco de palavras) é a única parte nãotrivial do bundle.** Ele é
  versionado junto com o código, o que torna a palavra do dia reprodutível: a mesma
  data + a mesma versão do bundle = a mesma palavra.

### 2.1 Por que não há back-end no MVP

| Alternativa | Custo | Benefício | Decisão |
|---|---|---|---|
| API serverless para a palavra do dia | Infra, cold start, custo variável | Pode editar a palavra do dia "no ar" | **Rejeitada** — determinismo local é mais simples e mais barato |
| Banco de dados + autenticação | Schema, migrações, compliance com dados de crianças | Sincronização entre dispositivos, ranking | **Rejeitada** — sem cadastro é requisito do MVP |
| Static + `localStorage` | Perda de dados se o storage for limpo | Zero fricção, zero custo, offline | **Escolhida** |

A consequência relevante é que **a perda de dados precisa ser um estado previsto**.
Se o `localStorage` estiver indisponível (aba anônima, cookies bloqueados, quota
estourada), o jogo continua jogável e apenas perde o histórico. Isso está
implementado em `src/lib/storage.ts` e coberto por testes.

---

## 3. Stack e justificativa

| Camada | Escolha | Por quê |
|---|---|---|
| Build | **Vite 6** | Cold start de segundos, config mínima, preview de produção idêntico ao dev |
| Linguagem | **TypeScript 5 (strict)** | O núcleo do jogo (feedback, streak, seed) é pura composição de regras — o tipo é o que impede um bug silencioso |
| UI | **React 19** | Componentes com estado explícito; `aria-live` e foco são fáceis de controlar por componente |
| Estilo | **Tailwind CSS 4** | Tokens via CSS custom properties, útil porque a **paleta muda com o tema do dia** |
| Testes | **Vitest + Testing Library** | Mesma API do Vite; `jsdom` para os testes de componente |
| Lint | **ESLint 9 (flat config)** | `typescript-eslint` estrito, regras de hooks do React |
| Deploy | **Qualquer host estático** | `npm run build` produz `dist/` servível por CDN |

### 3.1 Decisões de stack que valem registro

**TypeScript strict com `noUncheckedIndexedAccess` desligado.** Ativá-lo tornaria
`result[i]` um `LetterStatus | undefined` em toda a lógica de feedback, exigindo
guards que só poluem o código. A compensação é o **teste exaustivo dos casos de
letra repetida** (§ 5.2), que é onde o bug realmente moraria.

**Sem biblioteca de estado (Redux/Zustand).** O estado do jogo cabe em um `useState`
por-hook (`useGame`) e o estado da aplicação em um `usePersistedState`. Introduzir
uma biblioteca custaria mais em complexidade do que economiza em código.

**Sem biblioteca de UI (MUI/Chakra).** O sistema visual é pequeno e específico:
tiles com silhueta própria, teclado, cartões. Uma biblioteca de componentes
genéricos entraria em conflito com a identidade definida no protótipo escolhido e
embutiria um runtime de CSS de centenas de KB.

**`localStorage` em vez de IndexedDB.** O volume é minúsculo (dezenas de KB) e a API
síncrona simplifica a persistência. IndexedDB só faria sentido se o histórico
crescesse para milhares de partidas — está no roadmap (§ 18).

---

## 4. Estrutura de diretórios

```
cacaPalavras/
├── AGENTS.md                     # Diretrizes para agentes e contribuidores
├── docs/plans/                   # PRDs (regra: sempre aqui)
│   └── 2026-10-20-prd-jogo-adivinhacao-palavras.md
├── prototypes/                   # Mockups estáticos (galeria + 3 conceitos)
│   ├── index.html
│   ├── a-fluxo-claro.html
│   ├── b-acessivel.html
│   └── c-visual-tematico.html
├── src/
│   ├── App.tsx                   # Raiz: roteia telas, aplica tema, orquestra estado
│   ├── main.tsx
│   ├── index.css                 # Sistema de design (tokens, tiles, teclado)
│   ├── components/               # UI (sem regra de negócio)
│   │   ├── HomeScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── Tile.tsx
│   │   ├── Keyboard.tsx
│   │   ├── Legend.tsx
│   │   ├── ShareGrid.tsx
│   │   ├── LanguageSwitch.tsx
│   │   └── ThemeIllustration.tsx
│   ├── data/                     # Conteúdo e configuração
│   │   ├── themes.ts             # Temas, comprimento, paleta
│   │   ├── strings.ts            # i18n pt/en
│   │   └── words/                # Banco de palavras
│   │       ├── pt.ts
│   │       ├── en.ts
│   │       └── index.ts          # Índice + validação
│   ├── hooks/
│   │   ├── useGame.ts            # Máquina de uma partida
│   │   ├── usePersistedState.ts  # Estado persistido
│   │   └── useCountdown.ts
│   ├── lib/                      # Lógica pura (testável sem DOM)
│   │   ├── types.ts
│   │   ├── normalize.ts
│   │   ├── feedback.ts
│   │   ├── daily.ts
│   │   ├── date.ts
│   │   ├── rules.ts
│   │   ├── share.ts
│   │   └── storage.ts
│   └── test/                     # Testes
└── ...
```

**Regra de fronteira:** `src/lib` e `src/data` não importam React. `src/components`
não conhecem regras de negócio — recebem tudo por props. Isso é o que permite testar
a lógica sem DOM e garante que a UI não invente regra.

---

## 5. Modelos de dados

### 5.1 Tipos de domínio (`src/lib/types.ts`)

```ts
type Language = 'pt' | 'en';
type ThemeId = 'animals' | 'food' | 'science' | 'sports';

type LetterStatus = 'correct' | 'present' | 'absent';
type KeyStatus = LetterStatus | 'unused';

interface Attempt {
  guess: string;              // normalizado (sem acento)
  statuses: LetterStatus[];   // feedback posicional
}

type GameOutcome = 'playing' | 'won' | 'lost';

interface GameState {
  dateKey: string;             // YYYY-MM-DD local
  themeId: ThemeId;
  language: Language;
  length: number;
  attempts: Attempt[];
  outcome: GameOutcome;
  isPractice: boolean;         // treino não afeta streak nem stats
}

interface Stats {
  currentStreak: number;
  bestStreak: number;
  games: number;
  wins: number;
  lastPlayedDate: string | null;
  lastWord: string | null;
  guessDistribution: number[]; // índice = tentativas - 1
}

interface DailyPuzzle {
  dateKey: string;
  language: Language;
  themeId: ThemeId;
  length: number;
  answer: string;              // COM acento (é o que aparece na tela)
  normalizedAnswer: string;    // SEM acento (é o que o jogador digita)
  dayNumber: number;
}
```

### 5.2 Estado persistido (`src/lib/storage.ts`)

```ts
interface PersistedState {
  version: 1;
  language: Language;
  stats: Stats;
  daily: Record<string, DailyRecord>;  // chave = YYYY-MM-DD
  practice: GameState | null;
}
```

Regras de persistência:

- **Chave única** `cacaPalavras:v1`, com campo `version` para migração futura.
- **Histórico limitado a 60 dias** (`MAX_HISTORY_DAYS`), podado a cada gravação, para
  que o `localStorage` não cresça indefinidamente.
- **Gravação debounced** em 150 ms (`usePersistedState`): escrever em disco a cada
  tecla seria desperdício, e o estado só muda em eventos discretos.
- **Falha de escrita é silenciosa e não fatal**: o jogo continua em memória.

### 5.3 Normalização (`src/lib/normalize.ts`)

```ts
function normalize(input: string): string {
  return input.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
```

`NFD` decompõe `ã` em `a` + U+0303 e `ç` em `c` + U+0327; o `replace` remove os
marcadores combinantes. Resultado: `maçã` → `maca`, `TÊNIS` → `tenis`, `célula` → `celula`.

**Por que isso existe:** o teclado virtual não tem teclas de acento. Se a comparação
não fosse normalizada, a resposta `maçã` seria **impossível** de acertar — o jogador
não conseguiria digitar `ã`. A normalização elimina o beco sem saída sem obrigar o
teclado a ter duas camadas.

---

## 6. Algoritmos

### 6.1 Geração da palavra do dia (`src/lib/daily.ts`)

**Seed.** FNV-1a de 32 bits sobre a string `` `${dateKey}|${language}|${themeId}|word` ``,
alimentando um PRNG **mulberry32**.

```ts
function hashString(value: string): number { /* FNV-1a */ }
function mulberry32(seed: number): () => number { /* PRNG 32-bit */ }
```

Por que mulberry32: 8 linhas, sem dependência, período de 2³², e crucially é
**determinístico e reproduzível** — o mesmo seed dá a mesma sequência em qualquer
engine JavaScript, o que é requisito para a palavra ser igual para todos.

**Tema do dia.** O índice do tema sai de um seed próprio, e há uma regra de
**não repetir o tema do dia anterior**. A regra é *local* — o tema de hoje depende
apenas do tema de ontem —, o que cria uma dependência em cadeia:

```ts
function rawThemeIndex(dateKey, language) { /* índice pseudoaleatório 0..3 */ }

export function themeIndexFor(dateKey: string, language: Language): number {
  // 1. Caminha para trás até encontrar um dia já resolvido (cache) ou a época.
  // 2. Resolve a cadeia de trás para frente, aplicando a regra local.
  const raw = rawThemeIndex(day, language);
  previous = raw !== previous ? raw : (previous + 1) % THEME_IDS.length;
}
```

**Por que o deslocamento é `+1` e não "qualquer valor diferente".** A versão
ingênua (comparar com o valor *bruto* de ontem) podia colidir com o tema de ontem
**já ajustado** — e a colisão acontecia exatamente nos dias em que três temas brutos
coincidiam, que é justamente quando o jogador mais notaria a repetição. O `+1` módulo
4 é uma *permutação sem pontos fixos*: o tema de hoje é garantidamente diferente do
de ontem, qualquer que seja o valor bruto.

A repetição consecutiva é o erro mais perceptível numa rotação diária: o jogador
percebe que "o tema não muda" e para de voltar.

**Palavra.** `mulberry32(hash(...))` indexa o array de respostas do tema. Como o
array é fixo e ordenado, a mesma data devolve sempre o mesmo índice.

**Número do dia.** `dayNumber` conta os dias desde 2024-01-01 em UTC
(`Date.UTC` / 86 400 000) — imune a horário de verão. Alimenta o rótulo
"Palavra do dia nº N", que cria a sensação de coleção e ritual.

### 6.2 Feedback por letra (`src/lib/feedback.ts`)

Este é o algoritmo mais importante do produto e o motivo de a função ser isolada e
testada exaustivamente.

**Regra em duas passagens:**

1. **Verdes primeiro.** Cada letra na posição correta é marcada e *consome* uma
   ocorrência daquela letra na resposta.
2. **Amarelos depois.** Só as letras restantes podem ser amarelas, e apenas se ainda
   houver ocorrências sobrando.
3. **Cinza é o excedente.**

```ts
export function computeFeedback(answer: string, guess: string): LetterStatus[] {
  const a = normalize(answer);
  const g = normalize(guess);
  const result: LetterStatus[] = new Array(g.length).fill('absent');
  const remaining = new Map<string, number>();

  // Passagem 1 — verdes.
  // O laço percorre a TENTATIVA, não a resposta: o feedback descreve as letras que
  // o jogador digitou. Se percorresse a resposta, letras além do fim da tentativa
  // entrariam na contagem e um "a" sobrando na resposta viraria amarelo indevido.
  for (let i = 0; i < g.length; i += 1) {
    if (g[i] === a[i]) {
      result[i] = 'correct';
    } else if (a[i] !== undefined) {
      remaining.set(a[i], (remaining.get(a[i]) ?? 0) + 1);
    }
  }

  // Passagem 2 — amarelos, consumindo o que sobrou.
  for (let i = 0; i < g.length; i += 1) {
    if (result[i] === 'correct') continue;
    const letter = g[i];
    const left = remaining.get(letter) ?? 0;
    if (left > 0) {
      result[i] = 'present';
      remaining.set(letter, left - 1);
    }
  }

  return result;
}
```

**Por que a ordem importa.** Fazer a passagem de amarelos antes da de verdes produz
resultados que contradizem o que o jogador vê. Exemplo clássico: resposta `banana`,
tentativa `aaaaa`. Com a ordem correta, as duas posições de `a` que coincidem viram
verde e as outras três ficam cinza. Com a ordem invertida, o jogador veria uma letra
verde e, na mesma linha, um `a` amarelo — impossível, já que a resposta não tem um
`a` sobrando.

| Resposta | Tentativa | Feedback | Por quê |
|---|---|---|---|
| `cobra` | `arroa` | `absent present absent present correct` | Só um `r` e um `a` existem; o `a` extra é cinza |
| `banana` | `aaaaaa` | `absent correct absent correct absent correct` | A resposta tem 3 `a`, não 6 |
| `maçã` | `maca` | `correct correct correct correct` | Comparação sem acento |

### 6.3 Estado do teclado (`deriveKeyState`)

O teclado acumula o melhor estado de cada letra. **A prioridade não é uma ordem
total — é uma ordem parcial**, e isso é uma decisão deliberada:

- `correct` é **terminal**: uma letra confirmada continua verde.
- `absent` é **terminal**: uma letra provada inexistente **permanece cinza**, mesmo
  que uma tentativa posterior a acerte. O jogador não deve ser levado a reusar uma
  letra que o jogo já descartou.
- `present` pode virar `correct`, mas nunca voltar a ser `absent`.

Além disso, o estado é **agregado dentro de cada tentativa**: se a mesma letra
aparece duas vezes na linha, o melhor estado vence.

Por que agregar? Porque o `computeFeedback` resolve as cópias da mesma letra de
forma independente: numa tentativa, a letra `x` pode estar "presente" na posição 1 e
"ausente" na posição 3 (a cópia foi consumida pelo verde de outra posição). Sem
agregar, o teclado terminava exibindo `x` como cinza — **contradizendo a própria
grade**, que a mostrava verde. A auditoria de conformidade encontrou esse caso
exatamente assim: `zxzya` seguido de `zxxzz` deixava a tecla `x` cinza e
desabilitada, enquanto a grade a exibia verde.

A ordem total ingênua (`correct > present > absent`) erraria justamente no último
caso, devolvendo ao teclado uma letra que o jogador já viu ser descartada. Este bug
foi encontrado pelos testes e está documentado no código.

### 6.4 Sequência (`src/lib/rules.ts`)

```ts
export function applyStreak(stats: Stats, dateKey: string): Stats {
  if (stats.lastPlayedDate === dateKey) return stats;   // idempotente

  const continues = stats.lastPlayedDate === previousDateKey(dateKey);
  const currentStreak = continues ? stats.currentStreak + 1 : 1;

  return {
    ...stats,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    lastPlayedDate: dateKey,
  };
}
```

**Regras:**
- O streak conta **dias consecutivos jogados** (vencer ou perder). O que o interrompe é
  **pular um dia** — pular zera para 1 no próximo jogo, não para 0.
- Jogar duas vezes no mesmo dia é **idempotente**: não infla a sequência.
- A comparação é por **data de calendário local**, nunca por tempo decorrido. Usar
  timestamps UTC quebraria o streak em fusos negativos (a virada do dia local chega
  antes) e em transições de horário de verão.

**`previousDateKey`** usa `new Date(y, m-1, d, 12)` — meio-dia local. Construir a data
à meia-noite seria vulnerável ao bug das 2h em DST (o instante pode não existir em
certos fusos).

### 6.5 Limite de tentativas

```ts
export function maxAttempts(_length: number): number {
  return 6;
}
```

O limite de seis tentativas é fixo para todos os comprimentos, conforme o PRD.

### 6.6 Garantia de "um jogo por dia"

O PRD exige que o jogador não possa repetir a partida do dia (§ 8, § 13). A
implementação tem **três camadas** de garantia, porque uma só não é suficiente:

1. **Interface.** A tela inicial consulta o registro do dia: se ele estiver
   concluído, o botão principal deixa de ser "Jogar" e passa a oferecer o treino.
2. **Registro.** Ao terminar a partida, o registro do dia passa de `'playing'` para
   `'won'`/`'lost'`. Sem isso, a camada 1 nunca ativaria.
3. **Contabilidade.** A atualização do registro e a das estatísticas acontece na
   **mesma** operação de estado (`setState` com um único updater), e o updater
   aborta se o dia já estiver concluído.

A camada 3 é o detalhe que faz a diferença. Duas operações separadas — gravar o
registro e depois atualizar as estatísticas — criam uma janela em que a guarda de
redundância lê o registro **já finalizado** e aborta a contagem (ou, na ordem
inversa, a interface ainda oferece "Jogar" porque o registro não foi gravado).
Uma única atualização atômica elimina a janela.

O modo treino é a válvula de escape: ele usa uma palavra **diferente** da palavra do dia, e não
toca em registro, streak nem estatísticas.

### 6.7 Validação de tentativa

A validação acontece em quatro etapas, **nenhuma das quais consome tentativa** até
que a palavra seja aceita:

| # | Verificação | Mensagem |
|---|---|---|
| 1 | Não vazia | "Digite uma palavra antes de enviar." |
| 2 | Comprimento correto | "A palavra precisa ter N letras." |
| 3 | Não repetida nesta partida | "Você já tentou essa palavra." |
| 4 | Existe no dicionário do idioma/comprimento | "Essa palavra não existe. Tente outra!" |

As tentativas 1–4 são erros **não punitivos**: o jogador não perde uma chance por
digitar errado. Isso é uma decisão de UX, não só de implementação, e responde
diretamente ao risco de "frustração por dificuldade excessiva" listado no PRD § 18.

---

### 6.8 O modo treino joga outra palavra

O treino usa o **mesmo tema e o mesmo comprimento** do dia, mas uma palavra
**diferente** da palavra oficial:

```ts
const index = (dailyIndex + 1 + session) % pool.length;
```

Isso é uma decisão de produto, não um detalhe de implementação. Quando o treino
jogava a mesma palavra, ele permitia **spoilerizar o desafio diário**: o jogador
descobria a resposta no treino e depois vencia a partida oficial na primeira
tentativa. O efeito era duplo e ruim — zerava o desafio (que é o produto) e
distorcia exatamente as duas métricas que o PRD § 17 usa para medir o jogo
(taxa de vitória e média de tentativas).

O índice avança uma posição a partir da palavra do dia, o que garante por
construção que as duas nunca coincidem. Cada treino **concluído** incrementa o
índice, então duas sessões seguidas não repetem a palavra.

### 6.9 Registro do dia escopado por idioma

A chave do registro é `` `${dateKey}|${language}` ``, e não apenas a data.

Sem o idioma no escopo, as tentativas feitas em português eram restauradas na
partida em inglês — com o feedback calculado contra a **resposta do outro idioma**.
O jogador veria uma grade verde e amarela descrevendo uma palavra que não era a
do desafio em que estava. É o tipo de informação visualmente falsa que faz o
jogador decidir com base num tabuleiro que não é o dele.

### 6.10 O quebra-cabeça é capturado no início da sessão

`GameSession` guarda o quebra-cabeça com `useState` no momento em que é montado,
em vez de lê-lo "ao vivo" da prop.

O motivo é concreto: concluir um treino avança o índice de palavras do treino, o
que **recalcula** o quebra-cabeça no `App`. Se a sessão continuasse lendo a prop,
a tela de resultado passaria a anunciar a *próxima* palavra do treino em vez da que
foi jogada — e o texto compartilhado sairia com o número do dia errado.

`GameSession` é remontado a cada sessão nova (`key={sessionId}`), então a captura
vale exatamente para a partida em andamento.

### 6.11 Robustez da persistência

Três defesas, todas em `src/lib/storage.ts` e `src/hooks/usePersistedState.ts`:

1. **Reidratação validada.** O `localStorage` pode conter dado corrompido (outra
   versão do app, extensão do navegador, escrita interrompida). As estatísticas são
   reidratadas campo a campo, com validação de tipo: um `guessDistribution` não-array
   faria `Math.max(1, ...dados)` lançar, e o jogo abriria em branco.
2. **Gravação descarregada no `pagehide`.** O debounce de 150 ms deixa uma janela em
   que a última alteração não chegou ao storage. Fechar a aba nessa janela perderia
   a partida do dia — a pior falha possível num jogo de sequência diária. O evento
   `pagehide` cobre fechamento de aba e navegação no histórico.
3. **Identidade estável dos callbacks.** Os handlers do `useGame` e o `input`/`game`
   ficam em referências, o que mantém `submit` com a mesma identidade entre renders.
   Sem isso, o listener de teclado físico era desinscrito e reinscrito a **cada
   tecla digitada**.

### 6.12 A virada do dia

O produto é "uma palavra por dia". Sem detectar a mudança de data, uma aba aberta
durante a noite continua servindo a palavra de ontem: o número do dia congela, o
registro é gravado na data errada e o streak nunca avança. O jogador perde o dia sem
nenhum sinal na interface.

`useToday` (`src/hooks/useToday.ts`) mantém a data local como **estado**, com duas
detecções complementares:

1. um **timeout agendado** para o instante exato da meia-noite local (com 5 s de
   folga, para não perder a corrida com o relógio do navegador);
2. uma checagem em `focus` e `visibilitychange`, que cobre o caso comum de quem volta
   ao app depois de horas com a aba em segundo plano.

A data participa da chave do memo do quebra-cabeça, então `puzzle`, `recordKey` e
`alreadyPlayed` trocam **juntos** na virada.

Uma consequência da virada: quem começa a partida às 23:59 e recarrega às 00:01
procura o registro pela chave do dia novo e não encontra nada. A busca inclui o
registro do **dia anterior**, enquanto ele estiver `playing` — a partida em andamento
sobrevive à virada.

### 6.13 A cadeia de temas em aritmética inteira

A regra "o tema de hoje é diferente do de ontem" é local, mas cria uma dependência
em cadeia que precisa ser resolvida desde a época — cerca de 1000 dias.

A primeira implementação caminhava pela cadeia usando a **data em string**,
formatando um `Date` e montando uma chave a cada passo. Isso custava ~14,5 ms de JS
bloqueante no primeiro render (nos dois idiomas), dentro do `useMemo` do `App`.

A cadeia passa a caminhar por **número de dia** (inteiro), e o hash do tema passa a
usar esse número. O mesmo percurso caiu para **~2,2 ms** — 6,7× mais rápido, sem
mudança de comportamento.

## 7. Banco de palavras (`src/data/words/`)

### 7.1 Duas listas, com finalidades distintas

Volumes medidos por `npm run verify:contrast`:

| Lista | Português | Inglês | Papel |
|---|---|---|---|
| `answers` — por tema | 50 / 50 / 53 / 50 = **203** | 50 / 50 / 57 / 52 = **209** | De onde a palavra do dia é sorteada. Curta e curada |
| `guesses[length]` | 220 (4) / 300 (5) / 260 (6) = **780** | 220 / 300 / 260 = **780** | Dicionário de tentativas aceitas. Amplo |
| **Total de palavras** | **983** | **989** | |

A separação é o que permite ao jogo ser justo: o jogador pode tentar milhares de
palavras, mas a resposta do dia **sempre** está na lista de respostas, e sempre
**também** está no dicionário de tentativas.

O banco é **gerado por script** (`src/data/words/*.ts` são artefatos), e o script
valida os invariantes na geração: comprimento exato por tema, ausência de duplicatas,
forma normalizada de toda resposta presente no dicionário, e volume mínimo por lista.
O mesmo conjunto de invariantes roda como **teste de CI** (`src/test/words.test.ts`),
para que uma edição manual do banco não degrade o jogo em silêncio.

### 7.2 Normalização como invariante

- `answers` guarda a forma **com acento** (`maçã`, `tênis`, `célula`) — é o que
  aparece na tela.
- `guesses` guarda **apenas** a forma normalizada (`maca`, `tenis`, `celula`).
- A forma normalizada de **toda** resposta é garantida estar no `guesses`
  correspondente — ver a rede de segurança abaixo.

### 7.3 Rede de segurança (`src/data/words/index.ts`)

```ts
// Se o conteúdo curado tiver um buraco, o jogador ficaria preso sem poder vencer.
for (const language of ['pt', 'en'] as const) {
  for (const words of Object.values(ANSWERS[language])) {
    for (const word of words) {
      const normalized = normalize(word);
      GUESS_SETS[language][normalized.length]?.add(normalized);
    }
  }
}
```

É uma invariante verificada em tempo de carga: **a resposta do dia é sempre
jogável**, mesmo que alguém edite o banco de palavras e esqueça de atualizar o
dicionário de tentativas. O custo é zero (uma passagem sobre ~400 palavras).

### 7.4 Validação do conteúdo

O banco é validado por um script de verificação (executado durante a curadoria):

1. Toda palavra de `answers[theme]` tem o comprimento do tema (5/4/6/5).
2. Toda palavra de `guesses[N]` tem exatamente N letras.
3. Não há duplicatas dentro de nenhum array, nem entre comprimentos.
4. Toda forma normalizada de `answers` está em `guesses`.
5. `guesses` não contém acento nem cedilha.
6. Toda palavra é composta apenas de letras.
7. Os arquivos compilam sob `tsc --strict`.

---

## 8. Internacionalização (`src/data/strings.ts`)

Dicionário por idioma, tipado como `typeof STRINGS['pt']`. Como o tipo vem da
entrada `pt`, **acrescentar uma string em `pt` sem acrescentar em `en` quebra a
compilação** — a regressão clássica de "metade da interface em português" vira erro
de build, não bug em produção.

```ts
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}
```

Placeholders no formato `{n}`, `{word}`, `{used}`, `{total}`, `{time}`.

**Troca de idioma** reinicia a partida em andamento (o dicionário e o tema mudam) e
leva o jogador de volta à tela inicial. É um comportamento deliberado: manter uma
tentativa em português numa partida inglesa produziria erros de validação confusos.

---

## 9. Design escolhido

### 9.1 A decisão

O painel de três agentes (UX, acessibilidade web, design visual) produziu três
mockups independentes a partir do mesmo PRD, em `prototypes/`. A decisão de design é
uma **síntese**, e não a escolha de um único arquivo:

| Conceito | Contribuição (adotado) | Rejeitado |
|---|---|---|
| **A — Clareza de Fluxo** (UX) | Hierarquia com um único CTA; "como jogar" em 2 frases sempre visível; estado "já jogou hoje" com contagem regressiva viva; erros de validação gentis que dizem o próximo passo; ordem de leitura da tela de resultado (veredito → palavra → tentativas → sequência → compartilhamento → ações) | Teclado de aparência progressiva — a telha é o input primário e escondê-la cria um segundo passo desnecessário |
| **B — Shape-First** (Acessibilidade) | **Sistema de silhuetas** das tiles (arredondada / chanfrada / tracejada) + símbolos ✓/↑/✗ + `aria-label` descritivo; legenda permanente; navegação por teclado físico; `aria-live`; foco visível; alvos de toque; `prefers-reduced-motion` | Modo "sem cor" como configuração — a redundância de forma já resolve o daltonismo sem custar um interruptor ao usuário |
| **C — Identidade Temática** (Design visual) | **Paleta por tema** aplicada via CSS custom properties; ilustração SVG autoral do tema; tipografia com personalidade; selo de tema; "Palavra do dia nº N"; tiles com profundidade; celebração na vitória | Excesso de decoração competindo com a grade — o Conceito C é o mais_identity-rich e o mais_risco de hierarquia |

**Direção resultante:** *identidade temática (C) sobre uma base inacessível-por-padrão
(B), com o fluxo do A.*

A justificativa é que o PRD pede duas coisas que raramente convivem: **diversão
visual com identidade** (§ 6, "Divertido e memorável") e **acessibilidade WCAG AA**
(§ 12, "suporte básico para acessibilidade visual"). Um conceito só de
acessibilidade entrega o primeiro e esmaga o segundo; um conceito só visual entrega
o oposto. A síntese entrega os dois, e a parte de acessibilidade é a que **não se
negocia** — é requisito de aceite (PRD § 16), enquanto identidade é preferencial.

### 9.2 Sistema de tokens (`src/index.css`)

O tema do dia é aplicado na raiz do documento, o que torna "trocar de tema" uma
atribuição de três custom properties:

```ts
root.style.setProperty('--theme-primary', theme.palette.primary);
root.style.setProperty('--theme-accent',  theme.palette.accent);
root.style.setProperty('--theme-surface', theme.palette.surface);
```

| Tema | Comprimento | `primary` | `accent` | `surface` |
|---|---|---|---|---|
| Animais | 5 | `#2f9e6b` | `#ffd166` | `#e9f7ef` |
| Comida | 4 | `#e4572e` | `#ffb703` | `#fdefe7` |
| Ciência | 6 | `#3d5afe` | `#8e44ad` | `#eceffd` |
| Esportes | 5 | `#1b6ca8` | `#00b4d8` | `#e6f2fa` |

**Regra herdada do Conceito C: o tema pinta o cenário, nunca a grade.** As cores
semânticas do jogo (verde / amarelo / cinza) são **fixas entre todos os temas**. Se o
verde mudasse a cada dia, o jogador teria que reaprender o código de cores toda
manhã — a cor de feedback é *linguagem*, não decoração. O que muda por tema é o
cenário: fundo, superfícies, botões, ilustração e selo.

Estados de feedback, com contraste conferido:

Os números abaixo são **medidos**, não estimados: `npm run verify:contrast` reproduz
a tabela e **falha** se algum par reprovar.

| Elemento | Cor | Texto | Contraste | Exigência |
|---|---|---|---|---|
| Letra da tile correta | `#2a8053` | `#ffffff` | 4,87:1 | 4,5:1 |
| Letra da tile presente | `#e0a11b` | `#1b2430` | 6,92:1 | 4,5:1 |
| Símbolo ✗ da tile ausente | — | `#5d6a76` | 5,12:1 | 4,5:1 |
| Borda tracejada da tile ausente | — | `#7e8b97` | 3,22:1 | 3:1 (1.4.11) |
| Texto auxiliar (inclusive "como jogar") | — | `#65727d` | 4,55:1 | 4,5:1 |
| Botão primário — tema animais | — | `#ffffff` sobre `#1e6f4b` | 6,12:1 | 4,5:1 |
| Botão primário — tema comida | — | `#ffffff` sobre `#a53a18` | 6,53:1 | 4,5:1 |
| Botão primário — tema ciência | — | `#ffffff` sobre `#2b3fc4` | 8,04:1 | 4,5:1 |
| Botão primário — tema esportes | — | `#ffffff` sobre `#0f4a73` | 9,34:1 | 4,5:1 |
| Nome do tema no cabeçalho | — | variante escura | 5,65:1 a 8,63:1 | 4,5:1 |

**Variante escura por tema.** Cada tema tem duas cores: `primary` (marca, usada em
cenário e ilustração) e `dark` (usada em fundo de botão e faixa, sempre com texto
branco). A cor de marca pura **não** atinge 4,5:1 com branco nos temas animais e
comida (3,11:1 e 3,40:1) — usá-la como fundo de botão reprovava metade dos dias.
A variante escura resolve sem sacrificar a identidade visual, e é a mesma solução
que o Conceito C já trazia (`--c-primary-d`).

**Estado "correto" escurecido.** A verde de marca `#2f8f5b` dava 4,04:1 com o branco
da letra. A letra da tile chega a 14 px no menor breakpoint — ou seja, é *texto
normal* e exige 4,5:1. A verde `#2a8053` dá 4,87:1.

**Símbolos de estado.** O `✓` usava um verde-claro sobre o verde da tile, o que dava
4,06:1. Trocado por branco puro (4,87:1).

**A letra que está sendo digitando** tem tratamento visual próprio
(`.tile--current`): ela é o conteúdo mais importante da tela naquele instante, e
usava a cor mais fraca da paleta. Agora usa `ink` (16,48:1 sobre a superfície).

### 9.3 Linguagem de forma das tiles

O requisito mais importante do sistema visual: **a cor nunca é o único sinal**
(WCAG 1.4.1). Cada estado tem uma silhueta distinta:

```
   ✓ correto        ↑ presente        ✗ ausente
  ┌────────┐      ╱────────╮       ┌╌╌╌╌╌╌╌╌┐
  │        │     │         │      │        │
  │   A    │     │   E     │      │   R    │
  │        │      ╲        │      └╌╌╌╌╌╌╌╌┘
  └────────┘                (contorno tracejado)
 (arredondado)        (canto chanfrado)
```

Implementação: `.tile--correct` com `border-radius`, `.tile--present` com
`clip-path` de canto chanfrado, `.tile--absent` com `border-style: dashed` e fundo
transparente. O símbolo (`✓` / `↑` / `✗`) fica no canto superior direito em corpo
pequeno, sem competir com a letra.

O `clip-path` do estado "presente" remove a borda — por isso a tile chanfrada não
tem `border`, apenas o preenchimento.

---

## 10. Componentes de interface

| Componente | Responsabilidade | Props principais |
|---|---|---|
| `HomeScreen` | Tema do dia, streak, CTA, treino, estatísticas, idioma | `puzzle`, `stats`, `alreadyPlayed` |
| `GameScreen` | Grade, teclado, legenda, anúncios, teclado físico | `game`, `input`, `error`, `announcement` |
| `ResultScreen` | Veredito, palavra, tentativas, sequência, compartilhamento | `result`, `stats`, `isPractice` |
| `StatsScreen` | Sequência, melhor sequência, vitórias, % de acerto, histograma e **apagar dados** | `stats`, `onDataCleared` |
| `Tile` | Uma letra com forma, símbolo e `aria-label` | `letter`, `status`, `position` |
| `Keyboard` | Teclado virtual com memória de estado | `keyState`, `onLetter`, `onSubmit` |
| `Legend` | Legenda permanente dos três estados | `language` |
| `ShareGrid` | Grade de emoji para compartilhamento | `result` |
| `LanguageSwitch` | Seletor PT/EN como `radiogroup` | `language`, `onChange` |
| `ThemeIllustration` | SVG do tema do dia | `themeId` |

### 10.1 Hierarquia da tela de partida

```
[ ← Início ]        [ Tema do dia ]        [ ícone ]
                  Tentativas restantes: 5
        ┌────────────────────────────┐
        │   grade de tentativas      │   ← elemento focal
        └────────────────────────────┘
              mensagem de erro
               legenda (✓ ↑ ✗)
        ┌────────────────────────────┐
        │       teclado virtual      │
        └────────────────────────────┘
```

A grade fica acima do teclado no DOM porque é ela que carrega a informação; o teclado
é instrumento. Em telas de 320 px, a coluna tem largura total e o teclado usa
`max-width` para não esticar.

### 10.2 Teclado físico

`GameScreen` registra um `keydown` na `window`:

- `Enter` → envia
- `Backspace` → apaga
- `/^[a-zA-Z]$/` → digita

Ignora eventos com `metaKey`/`ctrlKey`/`altKey` para não sequestrar atalhos do
navegador. A tecla digitada é normalizada, então tanto `A` quanto `a` funcionam.

---

## 11. Fluxo de dados e máquina de estados

### 11.1 Estados de uma partida

```
                 ┌──────────────┐
                 │   playing    │◀──────────┐
                 └──────┬───────┘           │
        entrada inválida │                   │ nova tentativa
        (não consome)    ▼                   │
                 ┌──────────────┐           │
                 │   (erro)     │───────────┘
                 └──────────────┘
                        │ tentativa válida
                        ▼
              ┌───────────────────┐
              │  tentativa criada │
              │  feedback calculado│
              └────┬─────────┬────┘
                   │         │
             guess == answer│ tentativas == limite
                   ▼         ▼
              ┌────────┐  ┌────────┐
              │  won   │  │  lost  │
              └────────┘  └────────┘
```

### 11.2 Fluxo de uma ação

```
usuário clica em uma letra
        │
        ▼
useGame.typeLetter()
        │  setInput(prev => prev.length < length ? prev + normalize(letter) : prev)
        │  setError(null)
        ▼
GameScreen re-renderiza a tile ativa
```

```
usuário clica em "enviar"
        │
        ▼
useGame.submit()
        │
        ├─ inválida → setError(código) + setAnnouncement(mensagem) → NÃO consome tentativa
        │
        └─ válida → computeFeedback(answer, guess)
                   → push Attempt em state.attempts
                   → setAnnouncement(descrição da linha para aria-live)
                   → onAttempt(attempts)  → persiste a partida em andamento
                   → se terminou: onComplete(result) → atualiza streak e estatísticas
```

### 11.3 Por que a partida vive em `GameSession`

`App` renderiza `GameSession` com uma `key` (`sessionId`) que só muda quando um
jogo novo começa. Isso resolve dois problemas de uma vez:

- Alternar entre a tela de partida e a de resultado **não remonta** o componente, e
  portanto não perde o histórico de tentativas.
- Trocar de idioma ou iniciar o treino **remonta**, zerando o estado de forma limpa.

```tsx
{screen === 'game' ? (
  <GameSession key={sessionId} puzzle={puzzle} mode={mode} ... />
) : null}
```

---

## 12. Acessibilidade como requisito de arquitetura

Não é uma camada final de polimento: é uma restrição sobre o modelo de dados e
sobre os componentes.

| Requisito | Como é resolvido | Onde |
|---|---|---|
| Cor não é o único sinal (1.4.1) | Forma + símbolo + `aria-label` por tile **e por tecla** (as três fileiras usam o mesmo componente) | `Tile.tsx`, `Keyboard.tsx`, `index.css` |
| A letra em digitação é audível (4.1.2) | `role="img"` + `aria-label` "Posição N: X, digitando" | `Tile.tsx` |
| O resultado final é anunciado (4.1.3) | A região viva passa a conter "Você acertou! A palavra era X" | `useGame.ts` |
| O erro é anunciado uma vez só (3.3.1) | `role="alert"` na tela; a região viva é limpa | `GameScreen.tsx`, `useGame.ts` |
| Foco não se perde na troca de tela (2.4.3) | O `<h1>` de cada tela recebe o foco ao ser montado | `useFocusOnMount.ts` |
| O teclado físico funciona depois de tocar no virtual (2.1.1) | `Backspace` é sempre tratado; só `Enter` respeita o controle focado | `GameScreen.tsx` |
| `radiogroup` segue o padrão ARIA | Tabindex móvel + navegação por setas | `LanguageSwitch.tsx` |
| Info erelations (1.3.1) | `aria-label` descritivo em cada tile | `Tile.tsx` |
| Foco visível (2.4.7) | `:focus-visible` com outline 3 px, nunca removido | `index.css` |
| Navegação por teclado (2.1.1) | Ordem lógica de tabulação; `skip-link` | `App.tsx`, `GameScreen.tsx` |
| Alvos de toque (2.5.5) | Botões ≥ 44 px de altura; teclas do teclado ≥ 48 px | `index.css` |
| Status dinâmico (4.1.3) | `role="status"` + `aria-live="polite"` anuncia a linha | `GameScreen.tsx` |
| Erros (3.3.1) | `role="alert"` na mensagem de validação | `GameScreen.tsx` |
| Resize de texto (1.4.4) | Layout em `rem`/`clamp()`, sem largura fixa | `index.css` |
| Movimento (2.3.3) | `prefers-reduced-motion` desliga animações e transições | `index.css` |
| Idioma do documento (3.1.1) | `<html lang>` acompanha o idioma escolhido | `App.tsx` |
| Sem informação só por cor no teclado | Mesmo sistema de formas das tiles | `Keyboard.tsx` |

### 12.1 Onde vive a região `aria-live`

A região viva fica em `GameSession`, **não** dentro de `GameScreen`. Se morasse na
tela de partida, seria desmontada no instante em que a partida termina — e o leitor
de tela perderia justamente o anúncio mais importante, o do resultado final. Como
`GameSession` decide entre `GameScreen` e `ResultScreen` mas mantém o hook `useGame`
vivo, a região persiste nas duas telas.

O `role="status"` da confirmação "Copiado!" na tela de resultado usa
`aria-live="polite"` **sem** `role="status"`, para que exista exatamente uma região
`status` no app em cada momento — duplicá-la faria o leitor de tela anunciar a mesma
coisa duas vezes.

### 12.2 Acessibilidade em escala de cinza

O teste decisivo: imprimir a grade em preto e branco. As três silhuetas — quadrado
arredondado cheio, bloco chanfrado cheio, contorno tracejado vazado — permanecem
distintas, e o símbolo `✓ / ↑ / ✗` sobrevive à impressão em P&B. O estado é legível
por **três canais independentes**.

---

## 13. Estratégia de testes

```
npm test          # uma vez
npm run test:watch
```

### 13.1 Pirâmide

| Camada | Ferramenta | Cobertura |
|---|---|---|
| **Unidade** (puro) | Vitest | `feedback`, `daily`, `rules`, `share`, `normalize` |
| **Integração** | Vitest + Testing Library | Fluxo de uma partida na tela real |
| **Estático** | `tsc --noEmit` + ESLint | Tipos e regras de hooks |

### 13.2 Casos de teste que protegem as regras de negócio

A suíte tem **102 testes** em 8 arquivos. Os que protegem as regras mais caras:

| Caso | Por que importa |
|---|---|
| `computeFeedback` com letra repetida (`cobra`/`arroa`, `banana`/`aaaaaa`) | A ordem das passagens é a regra que o jogador sente |
| `computeFeedback` com tentativa mais curta que a resposta | Impede que uma letra sobrando na resposta vire amarelo indevido |
| `computeFeedback` ignorando acentos (`maçã`/`maca`) | Garante que a resposta acentuada é vencível |
| `deriveKeyState` — cinza é terminal | Protege o bug encontrado durante o desenvolvimento |
| `getDailyPuzzle` determinístico para a mesma data | A palavra precisa ser igual para todos |
| Tema do dia nunca repete o dia anterior | A rotação é a identidade do produto |
| `getDailyPuzzle` respeita o comprimento do tema | A tentativa e o layout dependem disso |
| `applyStreak` idempotente no mesmo dia | Jogar duas vezes não pode inflar a sequência |
| `applyStreak` atravessa a virada de mês | Comparator de data local |
| `maxAttempts` 6 para 4 letras, 7 para 5–6 | Regra comercial do PRD |
| `buildShareText` não contém a resposta | **Regra de privacidade**: o compartilhamento não pode vazar a solução |
| `buildShareText` traduz para EN | Cobertura de i18n no caminho crítico |

### 13.3 Testes de componente

- Renderizar a tela de partida, digitar pela interface, enviar e verificar o feedback
  aplicado e a mensagem de erro para palavra inválida.
- Verificar que a região `aria-live` recebe a descrição da linha.
- Verificar que trocar de idioma reescreve a interface.
- Verificar que a partida do dia não pode ser repetida nem inflar as estatísticas.
- Verificar que o treino não altera streak nem estatísticas, e usa outra palavra.
- Verificar que a partida em andamento é restaurada depois de recarregar.
- Verificar que “apagar meus dados” zera as estatísticas.
- Verificar que o app abre com um `localStorage` corrompido.

### 13.4 Testes de propriedade

`src/test/feedback.property.test.ts` verifica **invariantes que valem para qualquer
entrada**, e não apenas casos fixos. É o que pega a classe de bug em que um exemplo
conhecido passa e a regra geral está errada:

| Invariante | Por que importa |
|---|---|
| Nunca confirma mais cópias de uma letra do que a resposta tem | É a regra que impede o “amarelo fantasma” |
| Verde só aparece quando a letra está exatamente na posição | Verde é a informação mais forte da tela |
| Nunca devolve mais posições do que a tentativa tem | A grade não pode ter tamanho errado |
| Acertar a palavra inteira produz verde em todas as posições | Caso limite do item acima |
| **O teclado nunca contradiz a grade** | Uma letra verde na grade não pode estar cinza no teclado |

A última invariante é a que protege a correção do `deriveKeyState`: ela roda sobre
tentativas aleatórias **contra a mesma resposta**, que é a única forma de a comparação
fazer sentido.

---

## 14. Performance e bundle

| Métrica | Alvo (PRD § 12) | Medido | Estratégia |
|---|---|---|---|
| LCP em rede estável | < 2 s | — | Bundle pequeno, sem imagens, fontes do sistema |
| Bundle inicial | < 150 KB gzip | **92,8 KB gzip** (87,7 JS + 5,1 CSS) | Sem biblioteca de UI/estado; o banco de palavras é texto puro |
| Chamadas de rede em runtime | 0 | 0 | Nada de API, analytics ou fonte externa |
| JavaScript bloqueante | apenas o bundle | — | Render de Vite com `modulepreload` |
| Scroll horizontal | 0 | **0 px** em 320/375/768/1280 | Layout em `clamp()` e `vw`, sem largura fixa |
| Alvos de toque abaixo de 44 px | 0 | **0** | `min-h-11` em todos os controles |
| Falhas de contraste WCAG | 0 | **0** | `npm run verify:contrast` reprova o build se houver |
| Funcionamento offline | § 12 | **abre offline** | Service worker com pré-aquece de cache e `ignoreVary` |
| Erros de console | 0 | **0** | — |

As três últimas linhas são **reproduzíveis**, não afirmações: `npm run verify:ui`
abre o app em Chrome headless, percorre as telas, mede o scroll horizontal e os
alvos de toque, e confere o funcionamento offline; `npm run verify:contrast`
recalcula as razões de contraste a partir dos tokens do CSS e a volumetria do banco
de palavras; `npm run smoke` percorre a **jornada completa** do jogador em um
navegador real — tela inicial, partida, vitória, compartilhamento, cópia para a
área de transferência, estatísticas e limpeza de dados.

A auditoria de conformidade reprovou a versão anterior deste documento justamente
por afirmar números que ninguém podia reproduzir — daí os scripts virarem parte do
repositório.

O banco de palavras (≈1 970 palavras entre os dois idiomas) é o maior item do bundle.
É deliberado: é **dados**, não código, e comprime muito bem pelo gzip.
Como verificação, o `dist/` deve permanecer abaixo de 150 KB gzip.

O `usePersistedState` grava com debounce de 150 ms, evitando escrever no
`localStorage` a cada tecla.

---



## 15. Privacidade e segurança

**Coleta de dados: nenhuma.** O produto não pede cadastro, não envia telemetria e não
faz requisições de rede. Todo o estado é local ao navegador.

**Apagar dados é um clique.** Todo o histórico do jogador vive no `localStorage`. A
tela de estatísticas tem um controle "Apagar meus dados", com confirmação, que
limpa o storage. Num produto voltado a menores, dar controle explícito sobre os
próprios dados é o mínimo — e sem isso, apagar o histórico exigiria suporte.

Considerações específicas do público (crianças e jovens):

- **Sem rastreamento de terceiros**: nenhum pixel de analytics, nenhum script
  externo, nenhuma fonte de terceiro. O `index.html` não referencia nenhum recurso
  remoto.
- **Sem publicidade e sem monetização** no MVP (PRD § 19).
- **Sem compartilhamento implícito**: o botão de compartilhar só age quando o usuário
  o aciona, e o conteúdo compartilhado não contém a resposta (§ 6.6, teste
  correspondente).
- **Sem `eval` e sem HTML dinâmico**: o conteúdo de palavras é renderizado como texto
  pelo React.

### 15.1 Superfície de ataque

O produto não tem servidor, sessão, token nem banco de dados. As duas superfícies
relevantes são:

1. **`localStorage` adulterado** (usuário ou extensão). O estado é reidratado com
   validação defensiva: `version` verificada, `language` normalizada para um valor
   válido, `stats` mesclada sobre `EMPTY_STATS`. Um payload corrompido degrada para
   o estado inicial, não para um crash.
2. **XSS via conteúdo de palavras.** As palavras são strings do bundle, renderizadas
   como texto. Não há `dangerouslySetInnerHTML` em lugar nenhum.

---



## 16. Deploy

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build      # gera dist/
```

### Funcionamento offline

O PRD § 12 exige que o jogo abra offline depois da primeira visita, e o público
(crianças e jovens, rede instável, plano de dados limitado) torna isso requisito
de uso real, não detalhe técnico.

A implementação usa um **service worker** (`public/sw.js`) com estratégia mista:

- **Navegação:** rede primeiro, cache como reserva. Uma versão nova do app chega
  assim que há rede; sem rede, o app shell do cache abre.
- **Assets com hash no nome:** cache primeiro. Eles são imutáveis por construção, e
  o bundle inteiro (≈93 KB gzip) cabe no cache.

O registro só acontece em produção (`import.meta.env.PROD`) — em desenvolvimento ele
serviria o bundle antigo durante o HMR, que é a forma mais rápida de se perder
tempo depurando um bug já corrigido.

O app também instala como PWA (`public/manifest.webmanifest` + `public/icon.svg`),
o que o torna instalável na tela inicial do celular.

**Dois detalhes que só aparecem em teste real** (ambos foram achados pelo script de
verificação, não por leitura de código):

1. **Pré-aquece o cache.** O worker só assume o controle *depois* da primeira
   visita, então os assets da primeira página nunca passam pelo handler de rede e
   nunca entram no cache. Na segunda visita offline, o HTML vinha do cache mas o
   JavaScript não — página em branco, que é pior do que não abrir. A página manda
   ao worker a lista de recursos que carregou, e ele os guarda.
2. **`ignoreVary: true` no casamento do cache.** O servidor responde com
   `Vary: Origin`, e o script da aplicação é carregado com `crossorigin` — a
   requisição leva o cabeçalho `Origin`, enquanto a entrada no cache foi gravada
   sem ele. Com a checagem de `Vary` ativa, o casamento falhava. Era exatamente o
   mesmo sintoma do item 1, e por isso o `ignoreVary` é obrigatório, não
   cosmético.

### Requisitos do host

`dist/` é estático e pode ser servido por qualquer CDN. Requisitos do host:

- Fallback de SPA para `index.html` (aplicável se o roteamento crescer).
- `Cache-Control: no-cache` para `index.html` e `immutable` para assets com hash —
  o padrão do Vite já gera nomes com hash.
- HTTPS obrigatório (Web Share API e Clipboard API exigem contexto seguro).

---



## 17. Riscos técnicos

| Risco | Impacto | Mitigação implementada |
|---|---|---|
| Ordem do feedback de letra invertida | Jogador vê resultado contraditório | Duas passagens explícitas + 6 testes de letra repetida |
| Resposta acentuada impossível de digitar | Jogador não consegue vencer | Normalização em toda comparação + rede de segurança do dicionário |
| Lista de tentativas incompleta | "Essa palavra não existe" em palavra válida | Invariante verificada na carga do módulo |
| Streak quebrando por fuso/DST | Métrica de retenção corrompida | Comparação por data local; `previousDateKey` ao meio-dia |
| Duplo clique inflando o streak | Métrica corrompida | `applyStreak` idempotente |
| Re-render do componente perder a partida | Jogador frustrado | `key` estável em `GameSession` |
| `localStorage` bloqueado | Jogo quebrado | Falha silenciosa; o jogo segue em memória |
| Bundle crescendo com o conteúdo | LCP degradado | Métrica de bundle no CI; palavras são texto puro |
| Conteúdo de Curadoria com erro de comprimento | Layout quebrado | Teste automático de comprimento para todas as palavras |

---



## 18. Roadmap técnico

### Fase 1 — MVP (este documento)

- [x] Geração determinística da palavra do dia
- [x] Feedback por letra com duas passagens
- [x] Validação de tentativas (4 níveis, nenhuma punitiva)
- [x] Teclado virtual + teclado físico
- [x] Sequência, estatísticas e histórico
- [x] Compartilhamento sem spoiler (texto + grade de emoji)
- [x] Modo treino
- [x] 2 idiomas
- [x] WCAG 2.1 AA (contrast 0 falhas, verificado por script)
- [x] Testes unitários, de componente e de propriedade
- [x] Funcionamento offline (PWA instalável + service worker com app shell em cache)
- [x] Controle de privacidade: "apagar meus dados"

### Fase 2 — Retenção

- Notificação de lembrete diário (`Notification API`, com opt-in explícito)
- Histórico visual de partidas (calendário de streaks)
- Mais temas e mais palavras (as 6 categorias restantes do PRD § 21)

### Fase 3 — Escala

- Sincronização entre dispositivos (agora exigiria back-end — **reavaliar o PRD**)
- Modo multiplayer cooperativo
- Ranking global

### Fase 4 — Plataforma

- Migrar o banco de palavras para IndexedDB ou um serviço de CDN versionado
- Suporte a mais idiomas (espanhol, francês)
- Gamificação leve (conquistas, sem loja de itens)

---



## 19. Apêndice A — decisões técnicas (ADR resumido)

| # | Decisão | Alternativa rejeitada | Motivo |
|---|---|---|---|
| T1 | Sem back-end; seed determinístico | API de palavra do dia | Requisito de "mesma palavra para todos" resolvido sem custo nem latência |
| T2 | `localStorage` | IndexedDB / backend | Volume minúsculo, API síncrona, zero cadastro |
| T3 | Duas listas de palavras | Uma só | Permite jogo justo e vocabulário amplo |
| T4 | Normalização NFD em toda comparação | Acentos no teclado | O teclado sem acento é mais simples em mobile e nunca trava o jogador |
| T5 | Feedback em duas passagens | Uma passagem com contagem única | A ordem verde→amarelo é o que produz um resultado que o jogador reconhece como justo |
| T6 | `deriveKeyState` com estados terminais | Ordem total de prioridade | Cinza é terminal: a ordem total devolvia letras já descartadas |
| T7 | Streak por data local | Timestamp UTC | Fuso e DST quebrariam a métrica de retenção |
| T8 | Sem biblioteca de estado | Redux / Zustand | Estado cabe em dois hooks; a biblioteca custaria mais do que economiza |
| T9 | Sem biblioteca de UI | MUI / Chakra | Conflita com a identidade do design escolhido e pesa o bundle |
| T10 | Tokens via CSS custom properties | Classes condicionais por tema | Trocar o tema passa a ser 3 atribuições, não uma árvore de condicionais |
| T11 | Forma + símbolo + `aria-label` em toda tile | Cor apenas | WCAG 1.4.1: a cor não pode ser o único canal |
| T12 | GameSession com `key` estável | Estado elevado ao App | Evita perder a partida em re-render, sem boilerplate de "context" |
| T13 | I18n com tipo derivado do dicionário `pt` | `Record<Language, string>` solto | String faltante vira erro de compilação |
| T14 | Validação não consume tentativa | Tentativa inválida conta | Reduz frustração e abandono (PRD § 18) |
| T15 | Testes de componente com Testing Library | E2E com Playwright | E2E é lento e frágil para o que precisa ser garantido aqui; roda no CI rápido |
| T16 | Treino joga outra palavra do mesmo tema | Treino joga a palavra do dia | Permitia spoilerizar o desafio e distorcia as métricas de § 17 |
| T17 | Registro do dia escopado por idioma (`data\|idioma`) | Registro só por data | Tentativas de um idioma eram restauradas no outro, com feedback falso |
| T18 | Variante escura por tema para fundos com texto branco | Cor de marca como fundo de botão | A cor de marca não atinge 4,5:1 com branco em 2 dos 4 temas |
| T19 | Service worker com cache do app shell | Sem suporte offline | Requisito explícito do PRD § 12; o bundle cabe inteiro no cache |
| T20 | `shareOrCopy` retorna resultado tipado | Retorno booleano | "Cancelou" e "copiou" eram indistinguíveis, e a tela dizia "Copiado!" em ambos |
| T21 | Medições de contraste e layout viram scripts no repositório | Números citados no documento | A auditoria reprovou afirmações que ninguém conseguia reproduzir |
| T22 | Quebra-cabeça capturado no início da sessão | Lido "ao vivo" da prop | Concluir um treino recalculava a palavra e a tela de resultado anunciava a errada |
| T23 | Reidratação das estatísticas campo a campo | Spread sobre o padrão | Storage corrompido com `guessDistribution` não-array abria o app em branco |
| T24 | Gravação descarregada no `pagehide` | Só o debounce de 150 ms | Fechar a aba na janela de debounce perdia a partida do dia |
| T25 | Callbacks de `useGame` guardados em referência | Dependência direta dos props | O listener de teclado físico era recriado a cada tecla digitada |
| T26 | Testes de propriedade do feedback | Apenas casos fixos | Casos fixos passam com a regra geral errada; as invariantes cobrem qualquer entrada |
| T27 | Build com `tsconfig.build.json` (sem `src/test/`) | `tsc -b` sobre tudo | Um teste quebrado não pode impedir a build de produção |
| T28 | A grade deriva as linhas do **limite de tentativas**, não do comprimento da palavra | Linhas pelo comprimento da palavra | Palavras de 6 letras desenhavam 8 linhas em vez de 6, empurrando o teclado para baixo |
| T29 | Schema do registro `daily` validado na reidratação | Aceitar o bloco cru | Um registro malformado derrubava a tela de partida com `TypeError` — tela branca, sem recuperação |
| T30 | A data local é estado (`useToday`), não `new Date()` no memo | Memo só por idioma | A aba aberta durante a noite continuava servindo a palavra de ontem |
| T31 | Cadeia de temas em aritmética inteira | Caminhar por data em string | 14,5 ms → 2,2 ms de JS bloqueante no primeiro render |
| T32 | `submit` lê `game`/`input` por referência, sem listá-los nas dependências | Dependências com `game` e `input` | O lint apontava a dependência inútil: o listener de teclado era recriado a cada tecla |
| T33 | Foco movido para o `<h1>` ao trocar de tela | Sem gerenciamento de foco | O elemento focado era desmontado e o foco caía no `<body>` |
| T34 | O anúncio da região viva é o **resultado** no fim da partida | Só a descrição da linha | Quem usa leitor de tela ouvia a última linha e nunca soube que ganhou |
| T35 | Erros vão para o `role="alert"`; a região viva é limpa | A mesma frase nos dois canais | A mensagem era anunciada duas vezes |
| T36 | `Backspace` físico sempre ativo | Ignorado quando o foco está num controle | No mobile, tocar no teclado virtual deixava o foco no botão e o Backspace morria |
| T37 | Uma tecla de letra é um componente único nas três fileiras | Terceira fileira renderizada à parte | 7 letras comunicavam estado só pela cor |
| T38 | `radiogroup` com tabindex móvel e navegação por setas | Dois botões na ordem de tabulação | Padrão ARIA de `radiogroup` não era cumprido |
| T39 | Estatísticas distinguem "dias jogados" de "partidas" | Uma métrica só | Cada idioma tem seu desafio do dia: 2 partidas em 1 dia confundia as métricas de § 17 |
| T40 | A letra em digitação é `role="img"` com `aria-label` | Letra dentro de `aria-hidden` | Quem digita pelo teclado físico não recebia confirmação do que escreveu |
