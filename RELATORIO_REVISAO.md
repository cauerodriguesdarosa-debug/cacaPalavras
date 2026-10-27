# Relatório de revisão — cacaPalavras

## Resultado

O projeto foi revisado e ajustado para seguir o guia/PRD fornecido.

## Problema corrigido

- **Limite de tentativas inconsistente:** o guia/PRD define até 6 tentativas por desafio, mas a implementação, README e documentos derivados permitiam 7 tentativas para palavras de 5 ou 6 letras. O limite agora é 6 para todos os comprimentos (4–6 letras).
- **Estatísticas desalinhadas:** a distribuição de tentativas guardava 7 posições. Agora guarda 6, com normalização dos dados antigos ao carregar o `localStorage`.
- **Documentação e protótipos desatualizados:** README, PRD do projeto, documento técnico, galeria de protótipos e testes foram sincronizados com a regra de 6 tentativas.
- **Teste de integração desatualizado:** os testes esperavam 7 tentativas em algumas palavras; foram atualizados para validar a regra do PRD.

## Verificações executadas

- Testes automatizados: **102 passaram**, em 8 arquivos de teste.
- TypeScript (`tsc --noEmit`): passou.
- ESLint: passou.
- Build de produção (Vite): passou.
- Verificação de contraste: **0 falhas** nos pares de cores medidos.
- Contagem do banco de palavras: passou; 983 palavras PT e 989 EN, incluindo respostas e tentativas aceitas.

## Limitação do teste visual

O teste de fumaça em navegador real não pôde ser executado neste ambiente porque o Chrome não está instalado no caminho `/usr/bin/google-chrome`. Isso não impediu os testes automatizados nem o build, mas a validação visual em navegador deve ser executada localmente.

## Como executar

```bash
npm install
npm run dev
```

Para verificar novamente:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run verify:contrast
```

Para os testes em navegador real, instale/aponte o Chrome e defina `CHROME_PATH` se necessário antes de rodar `npm run smoke` ou `npm run verify:ui`.
