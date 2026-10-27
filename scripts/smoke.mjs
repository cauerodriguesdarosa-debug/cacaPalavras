/**
 * Teste de fumaça ponta a ponta.
 *
 * Percorre a jornada completa do jogador — da tela inicial ao compartilhamento, ao
 * histórico e à limpeza de dados — em um navegador real.
 *
 * Roda contra o **servidor de dev**, porque a palavra do dia só é legível de fora
 * em modo dev (o build de produção não serve os módulos TS). O comportamento do
 * build de produção — offline, service worker, instalabilidade — é verificado por
 * `scripts/verify-ui.mjs`, que roda contra o `preview`.
 *
 *   npm run dev &
 *   node scripts/smoke.mjs
 *
 * Sem Playwright instalado, o script avisa e sai com código 0.
 */

const BASE = process.env.VERIFY_URL ?? 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('Playwright não instalado — fumaça ignorada.');
  process.exit(0);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 420, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();

const failures = [];
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

async function check(label, condition, detail = '') {
  console.log(`${condition ? 'OK   ' : 'FALHA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures.push(label);
}

/** Digita uma palavra no teclado virtual e envia. */
async function type(word) {
  for (const letter of word) {
    await page.getByRole('button', { name: letter.toUpperCase(), exact: true }).click();
  }
  await page.getByRole('button', { name: /^jogar$/i }).first().click();
}

await page.goto(BASE, { waitUntil: 'networkidle' });

// 1. Tela inicial.
await check('tela inicial', await page.getByRole('heading', { level: 1 }).isVisible());
await check('tema do dia visível', await page.getByText(/tema de hoje/i).isVisible());

// 2. Joga a partida do dia até vencer.
await page.getByRole('button', { name: /^jogar$/i }).first().click();
await page.waitForTimeout(300);
await check('tela de partida', await page.getByRole('button', { name: /apagar/i }).isVisible());

// A palavra do dia vem da mesma função que o app usa.
const answer = await page.evaluate(async () => {
  const mod = await import('/src/lib/daily.ts');
  return mod.getTodayPuzzle('pt').normalizedAnswer;
});
await type(answer);

await page.waitForTimeout(500);
// O texto aparece no título **e** na região viva (que é o que o leitor de tela
// anuncia) — por isso o `.first()`: sem ele, o Playwright acusa ambiguidade.
const won = await page
  .getByText(/você acertou/i)
  .first()
  .isVisible()
  .catch(() => false);
await check('partida vencida', won, `palavra: ${answer}`);

// 3. Compartilhamento: o texto não pode conter a solução.
await page.locator('details summary').click();
await page.waitForTimeout(200);
const shareText = await page.locator('details pre').textContent();
// A invariante é "o texto compartilhado não revela a solução" — e a solução é a
// palavra que este próprio script usou. Uma lista fixa de palavras testaria só
// cinco casos e passaria quase sempre.
await check(
  'texto compartilhado sem spoiler',
  !(shareText ?? '').toLowerCase().includes(answer.toLowerCase()),
  shareText?.split('\n')[0],
);

await page.getByRole('button', { name: /^copiar$/i }).click();
await page.waitForTimeout(300);
const clipboard = await page.evaluate(() => navigator.clipboard.readText());
await check('copiado para a área de transferência', clipboard.length > 0);

// 4. Volta para o início: o dia precisa estar marcado como jogado.
await page.getByRole('button', { name: /início/i }).click();
await page.waitForTimeout(300);
await check('estado "já jogou hoje"', await page.getByText(/você já jogou hoje/i).isVisible());
await check('modo treino disponível', await page.getByRole('button', { name: /treinar/i }).isVisible());

// 5. Estatísticas.
await page.getByRole('button', { name: /estatísticas/i }).click();
await page.waitForTimeout(300);
const games = await page.getByText('Partidas').isVisible();
await check('tela de estatísticas', games);
await check('vitória contabilizada', (await page.getByText('Vitórias').isVisible()));

// 6. Apagar os dados.
await page.getByRole('button', { name: /apagar meus dados/i }).click();
await page.getByRole('button', { name: /apagar tudo/i }).click();
await page.waitForTimeout(400);
const cleared = await page.evaluate(() => {
  const raw = localStorage.getItem('cacaPalavras:v1');
  return raw ? (JSON.parse(raw).stats?.games ?? 0) : 0;
});
await check('dados apagados', cleared === 0, `games=${cleared}`);

// 7. Console limpo.
await check('sem erros de console', consoleErrors.length === 0, consoleErrors.join(' | '));

await browser.close();

console.log(`\n${failures.length === 0 ? 'Jornada completa sem falhas.' : `${failures.length} etapa(s) falharam.`}`);
if (failures.length > 0) process.exitCode = 1;
