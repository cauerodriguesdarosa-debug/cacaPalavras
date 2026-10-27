# PRD — Jogo Casual de Adivinhação de Palavras

| Campo | Valor |
|---|---|
| Produto | Jogo casual diário de adivinhação de palavras |
| Plataforma | Web responsiva mobile-first (PWA estática) |
| Público | Crianças e jovens, 8–18 anos |
| Mecânica principal | Desafio diário com palavras por tema |
| Estratégia | Retenção diária + crescimento orgânico |
| Monetização | Nenhuma no MVP |
| Status | Aprovado — v1.0 |
| Data | 2026-10-20 |
| Versão do documento | 1.0 (consolida o PRD base com as decisões de escopo) |

---

## 1. Visão geral do produto

Produto: jogo casual diário de adivinhação de palavras.
Plataforma: web responsiva mobile-first.
Público: crianças e jovens.
Mecânica principal: desafio diário com palavras por tema.
Estratégia: foco em retenção diária e crescimento orgânico.
Monetização: sem monetização no MVP.

O produto é um jogo casual em que o jogador tenta descobrir uma palavra secreta em algumas
tentativas. A experiência deve ser rápida, intuitiva e visualmente clara, com feedback imediato
e ritual diário, para aumentar o hábito de retorno.

---

## 2. Problema a ser resolvido

Jogos casuais de palavras têm grande potencial de engajamento, mas muitas experiências falham
por causa de:

- regras pouco claras
- onboarding pesado
- pouca clareza na mecânica
- baixa recorrência
- frustração por dificuldade excessiva
- falta de rotina e ritual diário

O produto resolve isso criando uma experiência:

- simples e acessível
- rápida de jogar
- visualmente direta
- organizada em temas
- recorrente e reforçada por streak

### 2.1 Referências de mercado e implicações de design

A análise de jogos do gênero (Wordle e derivados) aponta quatro implicações concretas
aplicadas a este PRD:

1. **Risco de imitação acidental.** Clones diretos do Wordle enfrentam ação jurídica de detentores
   de marca. A estratégia de temas por dia é a resposta: o produto se diferencia por
   vocabulário contextualizado, não por copiar mecânica e apresentação.
2. **Lacuna de acessibilidade estrutural.** O padrão de mercado usa cor como único canal de
   feedback, o que viola a WCAG 1.4.1. Este PRD adota **redundância de forma** (§ 10.3).
3. **Custo de validação.** O gênero exige duas listas distintas: respostas (curta, por tema) e
   tentativas aceitas (larga, por comprimento). Ver § 8.4.
4. **Streak como retention mechanism, mas com risco de frustração.** A sequência é o principal
   motivador de retorno do gênero, porém quebra quando o jogador pula um dia. O modo treino
   (§ 10.7) é a válvula de escape que preserva o hábito sem punir.

---

## 3. Objetivo do produto

**Objetivo principal:**

- aumentar a recorrência diária e manter uma sequência (streak) de jogadas

**Objetivos secundários:**

- tornar o jogo acessível para crianças e jovens
- ensinar palavras por tema de forma leve e divertida
- criar sensação de progresso sem exigir cadastro
- gerar crescimento orgânico por compartilhamento

---

## 4. Público-alvo

**Público principal:**

- crianças e jovens
- faixa etária aproximada: 8 a 18 anos
- usam celular e tablet com frequência
- gostam de jogos simples e rápidos
- respondem bem a feedback visual e desafios leves

**Necessidades:**

- entender a regra rapidamente
- gastar pouco tempo por partida
- sentir progresso
- receber retorno imediato
- manter um ritual diário sem esforço

---

## 5. Persona principal

**Nome:** Ana, 12 anos

**Perfil:**

- gosta de jogos rápidos e coloridos
- usa o celular todos os dias
- gosta de desafios e pequenas recompensas
- se interessa por temas e novidades
- gosta de compartilhar conquistas com amigos

**Necessidades:**

- entender o jogo em segundos
- sentir que está melhorando
- encontrar palavras relacionadas a temas que lhe interessam
- manter uma rotina divertida no dia a dia

---

## 6. Proposta de valor

O jogo oferece:

- uma partida por dia
- algumas tentativas para descobrir a palavra
- feedback visual claro
- sensação de aprendizagem incremental
- ritual diário com sequência
- temas interessantes por categoria
- compartilhamento simples e leve

---

## 7. Core loop do jogo

1. Usuário entra na tela inicial
2. Visualiza a categoria e a quantidade de letras
3. Tenta adivinhar a palavra
4. Recebe feedback por letra
5. Ajusta a próxima tentativa
6. Acerta ou esgota as tentativas
7. Vê o resultado final
8. Consulta estatísticas básicas
9. Compartilha o resultado sem revelar a solução

---

## 8. Regras do jogo

### 8.1 Palavra do dia

- Uma palavra por dia por usuário
- Palavra escolhida automaticamente pela data
- A palavra é **a mesma para todos os usuários** daquela data
- A escolha é **determinística**: derivada de um seed gerado a partir da data
- O tema do dia é igualmente determinístico, derivado da mesma data

### 8.2 Tentativas

- O jogador tem **6 tentativas** por desafio
- O limite é exibido na tela de partida

### 8.3 Tema e comprimento

O tema do dia define o comprimento da palavra:

| Tema (PT-BR) | Tema (EN) | Comprimento | Tentativas |
|---|---|---|---|
| animais | animals | 5 | 6 |
| comida | food | 4 | 6 |
| ciência | science | 6 | 6 |
| esportes | sports | 5 | 6 |

A tabela completa de 10 categorias (objetos, profissões, escola, tecnologia, hobbies) é do
**Roadmap — Próxima fase** (§ 21).

### 8.4 Validação de tentativas

- O sistema deve validar se a tentativa é uma palavra válida
- A validação consulta a lista de tentativas aceitas do idioma e do comprimento correspondentes
- Uma tentativa **repetida** (já usada na partida atual) deve ser rejeitada com aviso claro
- Uma tentativa com número de letras incorreto deve ser rejeitada antes da consulta ao dicionário
- Uma tentativa vazia deve ser rejeitada sem consumir tentativa

### 8.5 Acentuação

- O teclado virtual **não possui teclas de acento**
- A palavra-resposta **pode** conter acento ou cedilha (ex.: `maçã`, `tênis`, `célula`)
- A comparação entre tentativa e resposta é feita sobre a **forma normalizada**
  (sem diacríticos: `maca`, `tenis`, `celula`)
- A resposta é **exibida com acentuação** no fim da partida
- Consequência: o jogador nunca fica bloqueado por não conseguir digitar um acento

### 8.6 Feedback por letra

- verde: correta e na posição correta
- amarelo: correta, mas em outra posição
- cinza: não existe na palavra
- O estado de cada letra é **memorizado no teclado virtual** para orientar a próxima tentativa
- O estado do teclado é **priorizado**: se uma letra já está verde, ela fica verde para sempre;
  se já está cinza, permanece cinza

### 8.7. Proibido revelar

- O jogo não revela a resposta antes do fim
- O compartilhamento mostra apenas o resultado, sem expor a solução

---

## 9. Estrutura das categorias

A lista de temas pode incluir:

- animais
- comida
- ciência
- esportes
- natureza
- objetos
- profissões
- escola
- tecnologia
- hobbies

Para o MVP, a prioridade será:

- **animais** (5 letras)
- **comida** (4 letras)
- **ciência** (6 letras)
- **esportes** (5 letras)

---

## 10. Funcionalidades do MVP

### 10.1 Tela inicial

- nome do jogo
- botão para iniciar
- explicação curta de como funciona (2 frases no máximo)
- indicação do tema do dia
- seletor de idioma (PT-BR / EN)
- indicador da sequência atual
- acesso secundário ao modo treino (§ 10.7)
- estado "já jogou hoje", com contagem regressiva para o próximo dia

### 10.2 Tela de partida

- categoria do tema
- número de letras
- campo para inserir tentativas
- feedback por tentativa
- botão de envio
- opção de voltar ao início
- indicador de tentativas restantes
- teclado virtual customizado (QWERTY, 3 fileiras + apagar + enviar)
- suporte a teclado físico do computador

### 10.3 Feedback visual

- letras com status visuais
- verde: correta e na posição correta
- amarelo: correta, mas em outra posição
- cinza: ausente
- **redundância de forma obrigatória**: cada tile exibe também um símbolo —
  `✓` na posição correta, `↑` presente em outra posição, `✗` ausente
- **cor nunca é o único canal de informação** (WCAG 2.1 — 1.4.1)
- cada tile possui `aria-label` descritivo, ex.:
  `"Posição 2: A, letra correta na posição"`
- destaque claro para facilitar leitura

### 10.4 Tela de resultado

- mensagem de vitória ou derrota
- quantidade de tentativas usadas
- palavra correta revelada ao final (com acentuação)
- botão para voltar à tela inicial ou aguardar o próximo dia
- grid de resultado pronto para compartilhamento
- botões "Copiar" e "Compartilhar"

### 10.5 Estatísticas

- streak atual
- melhor streak
- total de vitórias
- total de partidas
- última palavra resolvida
- percentual de acerto
- distribuição de tentativas (histograma)

### 10.6 Compartilhamento

- botão para copiar resultado
- botão para compartilhar em redes sociais (Web Share API, com fallback de cópia)
- mensagem sem revelar a solução
- grid de emoji/quadrados com o padrão de tentativas (padrão do gênero)
- exemplo: `"Acabei de jogar hoje e usei 4 tentativas! Sequência: 5 🔥"`

### 10.7 Modo treino (opcional)

- disponível como ação secundária na tela inicial
- joga com as mesmas regras e o **mesmo tema** do dia, mas com uma **palavra
  diferente** da palavra oficial
- **não consome** a partida do dia
- **não afeta** a sequência atual nem a melhor sequência
- **não** é registrado nas estatísticas de partidas/vitórias do dia
- purpose: reduzir frustração e abandono quando a pessoa erra todas as tentativas
- **por que uma palavra diferente:** se o treino usasse a palavra do dia, ele
  permitiria spoilerizar o desafio — a pessoa descobriria a resposta no treino e
  venceria a partida oficial na primeira tentativa. Isso zeraria o desafio diário e
  distorçeria exatamente as duas métricas que a § 17 usa para medir o jogo (taxa de
  vitória e média de tentativas)

### 10.8 Acessibilidade

- nível alvo: **WCAG 2.1 nível AA**
- contraste mínimo 4.5:1 para texto e 3:1 para componentes e bordas
- redundância de forma em todos os estados de feedback (§ 10.3)
- navegação completa por teclado físico
- foco sempre visível
- alvos de toque de no mínimo 44×44 px
- regiões `aria-live` anunciando o resultado de cada tentativa e os erros de validação
- `prefers-reduced-motion` respeitado (animações desligadas)
- skip-link para o conteúdo principal
- texto redimensionável até 200% sem perda de conteúdo

---

## 11. Requisitos funcionais

- O sistema deve gerar uma palavra do dia com base na data
- O sistema deve associar a palavra a uma categoria
- O sistema deve validar se a tentativa é uma palavra válida
- O sistema deve calcular feedback por letra
- O sistema deve limitar o número de tentativas
- O sistema deve registrar o resultado da partida
- O sistema deve manter sequência diária do usuário
- O sistema deve armazenar histórico básico de jogadas
- O sistema deve exibir estatísticas simples
- O sistema deve permitir compartilhamento de resultado
- O sistema deve funcionar em mobile e desktop responsivos
- O sistema deve aceitar entrada por teclado e teclado virtual
- O sistema deve usar palavras com nível adequado à faixa etária
- O sistema deve oferecer os idiomas pt-BR e en
- O sistema deve oferecer modo treino que não afete o streak
- O sistema deve persistir o estado do jogo entre recarregamentos

---

## 12. Requisitos não funcionais

- interface clara e de leitura simples
- carregamento rápido (LCP < 2s em rede estável, 3G)
- layout responsivo de 320px a 1920px
- boa legibilidade em telas pequenas
- alta acessibilidade visual
- baixo consumo de dados (bundle inicial < 150 KB gzip)
- sem necessidade de cadastro obrigatório
- desempenho consistente em navegadores modernos (Chrome, Safari, Firefox, Edge — 2 últimas versões)
- estado persistido localmente, sem chamadas de rede após o carregamento inicial
- funcionamento offline após a primeira visita (cache de app shell) — **requisito do
  MVP**, implementado com service worker: o público tem rede instável e plano de
  dados limitado, e não conseguir abrir o jogo é falha de produto
- suporte básico para acessibilidade visual:
  - contraste adequado
  - fontes legíveis
  - botões grandes

---

## 13. Regras de negócio

- a palavra do dia é a mesma para todos os usuários daquela data
- a palavra deve estar no banco de palavras permitidas
- as palavras escolhidas devem atender ao tema do dia
- o usuário não pode repetir uma tentativa já feita
- palavras inválidas devem gerar aviso claro
- o sistema deve registrar a partida do dia como concluída ou não
- o sistema deve atualizar o streak quando o usuário joga e retorna no dia seguinte
- o sistema deve respeitar a lógica de "um jogo por dia" no MVP — **por idioma**:
  cada idioma tem a sua palavra do dia e o seu desafio. As estatísticas distinguem
  **dias jogados** (dias distintos com partida concluída) de **partidas** (cada
  desafio concluído), porque jogar nos dois idiomas no mesmo dia são 2 partidas em
  1 dia
- **o streak é calculado por data de calendário local**, não por timestamp UTC
  (dia pulado quebra a sequência; o dia corrente ainda pode ser jogado)
- **o streak conta dias consecutivos jogados** — vencer ou perder no dia não interrompe a
  contagem; o que interrompe é **pular um dia**. Isso mede o ritual de retorno, que é o objetivo
  do produto (§ 3), e não a sorte na palavra
- o modo treino nunca altera streak nem estatísticas

---

## 14. Fluxo principal do usuário

1. abrir o jogo
2. ver a categoria e a quantidade de letras
3. inserir a primeira tentativa
4. receber feedback
5. ajustar a próxima tentativa
6. repetir até resolver
7. confirmar resultado
8. ver estatísticas
9. compartilhar

---

## 15. Histórias de usuário

- Como jogador casual, quero entender a regra em poucos segundos para começar sem esforço.
- Como usuário, quero receber feedback visual por letra para saber como me aproximo da resposta.
- Como usuário jovem, quero ter temas divertidos para me interessar em jogar todos os dias.
- Como jogador, quero ver meu progresso para sentir que estou melhorando.
- Como jogador, quero compartilhar meu resultado sem expor a resposta para incentivar outros a jogar.
- Como jogador, quero continuar minha sequência diária para manter o hábito.
- Como usuário, quero treinar sem gastar meu jogo do dia para não perder minha sequência.
- Como usuário que joga em inglês, quero o jogo inteiro no meu idioma.
- Como usuário com baixa visão, quero entender o feedback sem depender de cores.
- Como usuário no celular, quero digitar com um teclado grande e fácil de acertar.

---

## 16. Critérios de aceitação

- A tela inicial deve carregar em menos de 2 segundos em rede estável
- O tutorial deve caber em até 2 frases curtas
- O jogo deve permitir até 6 tentativas por desafio
- A palavra deve ser validada antes de confirmar
- O feedback deve ser exibido imediatamente após a tentativa
- O resultado deve aparecer sem atraso
- O sistema deve manter o streak do usuário em base diária (data local)
- O resultado compartilhado não deve revelar a solução
- A experiência deve funcionar em celular com largura pequena (320px)
- Nenhum estado de feedback pode ser comunicado **apenas** por cor
- Todo tile de feedback deve expor `aria-label` descritivo
- A navegação por teclado deve alcançar todas as ações do jogo
- O resultado da tentativa deve ser anunciado em uma região `aria-live`
- Trocar o idioma deve reescrever toda a interface, incluindo as mensagens de erro
- Nenhum texto visível pode estar fixo em um idioma: toda a interface passa pelo
  dicionário de textos
- O contraste de todo texto deve atingir 4,5:1 e o de componentes e gráficos 3:1
- O estado do teclado nunca pode contradizer a grade: se a grade mostra a letra
  verde, a tecla correspondente não pode estar cinza nem desabilitada
- Pressionar Enter com uma tecla do teclado virtual focada deve ativar a tecla, e
  não submeter a palavra
- O modo treino não pode usar a palavra oficial do dia
- O histórico de um idioma não pode ser restaurado em outro idioma

---

## 17. Métricas de sucesso

**Principais métricas:**

- retenção em 1 dia
- retenção em 3 dias
- retenção em 7 dias
- taxa de conclusão da partida
- taxa de vitória
- média de tentativas por partida
- tempo médio de sessão
- streak médio
- número de compartilhamentos
- taxa de retorno no dia seguinte

**Métricas de qualidade:**

- taxa de tentativa inválida
- taxa de abandono na primeira tela
- taxa de erro de entendimento da mecânica
- tempo até a primeira jogada

---

## 18. Riscos e desafios

| Risco | Mitigação |
|---|---|
| palavras muito difíceis para a faixa etária | dicionário de tentativas amplo e curado por nível escolar; lista de respostas com dificuldade mista |
| excesso de frustração em alguns temas | modo treino (§ 10.7); feedback de "quase lá" |
| baixa retenção se o ritual diário não ficar claro | contador "palavra do dia nº N"; estado de "já jogou hoje" com contagem regressiva |
| pouca variedade se as categorias forem reduzidas demais | 4 temas × ~50 palavras × 2 idiomas com rotação por data |
| compartilhamento sem engajamento real | grid de resultados sem spoiler funciona como convite, não anúncio |
| dificuldade de destacar o jogo em um mercado competitivo | diferenciação por vocabulário temático e acessibilidade (o mercado tem lacuna real aqui) |
| dependência de `localStorage` (limpeza de dados/aba anônima) | degradação graciosa: o jogo segue jogável, apenas sem histórico |

---

## 19. Escopo do MVP

O MVP deve incluir:

- palavra do dia
- categoria temática
- 2 idiomas (pt-BR, en)
- 6 tentativas por desafio
- feedback por letras com redundância de forma
- tela de resultado
- streak simples
- estatísticas básicas
- compartilhamento
- modo treino
- layout mobile-first
- sem cadastro obrigatório
- sem monetização

---

## 20. O que não entra no MVP

- ranking global
- multiplayer
- compras internas
- assinatura
- sistema de avatar avançado
- temas muito complexos
- tutorial longo
- sistema de recompensas pesado
- contas de usuário / sincronização entre dispositivos
- backend / API de servidor

---

## 21. Roadmap sugerido

### MVP (v1)

- palavra do dia por tema
- feedback por letras
- streak diário
- estatísticas básicas
- compartilhamento simples
- 2 idiomas
- modo treino
- acessibilidade WCAG AA

### Próxima fase

- mais categorias (naturaleza, objetos, profissões, escola, tecnologia, hobbies)
- mais palavras por tema
- dificuldade personalizada por faixa etária
- histórico detalhado de partidas
- desafios semanais
- elementos sociais leves
- PWA instalável com notificações de lembrete diário

---

## 22. Definição final do produto

Produto: jogo casual diário de adivinhação de palavras para público jovem, com temas e ritual
diário, pensado para web mobile-first, sem monetização no MVP, com foco em retenção orgânica e
acessibilidade WCAG AA.

---

## 23. Decisões de escopo (log de decisões)

Estas decisões foram tomadas durante a elaboração do PRD e fecham as lacunas do documento base.

| # | Tema | Decisão | Justificativa |
|---|---|---|---|
| D1 | Idiomas | PT-BR e EN, com seletor na tela inicial | Amplia o alcance sem duplicar a engine; o banco de palavras é o único custo real |
| D2 | Comprimento | Variável por tema (4–6 letras) | Dá variedade sem quebrar o balanceamento de tentativas |
| D3 | Acentos | Teclado sem acentos; resposta pode ter; comparação normalizada | Impede o beco sem saída "não consigo digitar ã" |
| D4 | Entrada | Teclado virtual customizado + teclado físico | O virtual dá a memória visual das letras; o físico serve desktop e acessibilidade |
| D5 | Stack | React + Vite + TypeScript + Tailwind | Build rápido, tipagem para a lógica de feedback, testabilidade |
| D6 | Visual | Divertido e memorável | O público-alvo responde a cor e recompensa visual |
| D7 | Tentativas | 6 para todos os tamanhos | Regra simples e consistente, alinhada ao requisito do MVP |
| D8 | Modo treino | Sim, não afeta streak, com palavra diferente da do dia | Válvula de escape contra frustração e abandono; usar a mesma palavra permitiria spoilerizar o desafio |
| D9 | Compartilhamento | Grid de emoji + texto, sem spoiler | Padrão viral do gênero: mostra a jornada, convida ao desafio |
| D10 | Acessibilidade | WCAG 2.1 AA + redundância de forma | O gênero tem lacuna real aqui; ser a alternativa acessível é diferenciação |
| D11 | Temas | Determinístico por data | Garante a mesma palavra para todos sem servidor |
| D12 | Persistência | `localStorage`, sem conta | Zero fricção no onboarding; degradação graciosa se limpo |
| D13 | Offline | Service worker com cache do app shell, no MVP | O público tem rede instável e plano de dados limitado; não abrir o jogo é falha de produto |
| D14 | Registro por idioma | Registro só por data | Tentativas de um idioma não podem ser restauradas no outro, com feedback falso |
| D15 | Privacidade | Controle "Apagar meus dados" na tela de estatísticas | Todo o histórico é local; dar controle sobre ele é o mínimo num produto para menores |
| D16 | Treino com palavra distinta | Treino com a palavra do dia | Permitia spoilerizar o desafio e distorcia as métricas de § 17 |
| D17 | Um desafio por idioma, por dia | Um desafio por dia | Cada idioma tem sua palavra do dia; jogar nos dois no mesmo dia são 2 partidas em 1 dia — as estatísticas distinguem "dias jogados" de "partidas" |

---

## 24. Conclusão

O produto está pronto para implementação. O documento de projeto técnico descreve a arquitetura,
os modelos de dados, os algoritmos de feedback e a estratégia de testes que satisfazem este PRD.
