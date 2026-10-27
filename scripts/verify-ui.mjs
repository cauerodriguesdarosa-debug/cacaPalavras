/**
 * Verificação de interface em navegador real.
 *
 * As afirmações de layout e acessibilidade do documento de projeto técnico
 * (scroll horizontal zero, alvos de toque ≥ 44 px, funcionamento offline, ausência
 * de erros de console) só têm valor se forem **reproduzíveis**. Este script é essa
 * reprodução.
 *
 * Requer Playwright e o Chrome do sistema:
 *   npm run build && npm run preview &
 *   npm run verify:ui
 *
 * Sem Playwright instalado, o script avisa e sai com código 0 — a verificação
 * de UI é um extra, não um bloqueador do build.
 */

const BASE = process.env.VERIFY_URL ?? 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const WIDTHS = [320, 375, 768, 1280];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.log('Playwright não instalado — verificação de UI ignorada.');
  process.exit(0);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const failures = [];
const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(String(error)));

async function check(label, condition, detail = '') {
  const status = condition ? 'OK   ' : 'FALHA';
  console.log(`${status} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) failures.push(label);
}

// ── Carregamento e telas ─────────────────────────────────────────────────────
await page.goto(BASE, { waitUntil: 'networkidle' });
await check('tela inicial renderiza', await page.getByRole('heading', { level: 1 }).isVisible());

// ── Sem scroll horizontal em nenhuma largura ────────────────────────────────
for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await check(`sem scroll horizontal @${width}px`, overflow === 0, `${overflow}px`);
}

// ── Alvos de toque ≥ 44 px ───────────────────────────────────────────────────
await page.setViewportSize({ width: 375, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle' });
const smallTargets = await page.evaluate(() => {
  const out = [];
  for (const element of document.querySelectorAll('button, a')) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.height < 44) {
      out.push(`${(element.textContent ?? '').trim().slice(0, 16)}=${Math.round(rect.height)}px`);
    }
  }
  return out;
});
await check('todos os alvos de toque ≥ 44px', smallTargets.length === 0, smallTargets.join(', '));

// ── Fluxo de partida ─────────────────────────────────────────────────────────
await page.setViewportSize({ width: 420, height: 900 });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /^jogar$/i }).first().click();
await page.waitForTimeout(300);
await check('tela de partida renderiza', await page.getByRole('button', { name: /apagar/i }).isVisible());

// Teclado virtual preenche a tentativa.
const key = page.locator('button.key:not(.key--wide)').first();
await key.click();
await page.waitForTimeout(150);
// A letra digitada vive na tile "atual" (`.tile--current`); a vazia é só o espaço reservado.
const filled = await page.locator('.tile--current span').first().textContent();
await check('teclado virtual digita', (filled ?? '').trim().length === 1, `tile = "${filled}"`);

// ── Funcionamento offline (requisito do PRD § 12) ───────────────────────────
await page.goto(BASE, { waitUntil: 'networkidle' });
try {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15000 });
  await page.waitForTimeout(2000);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const heading = await page.getByRole('heading', { level: 1 }).textContent().catch(() => null);
  await check('app abre offline', Boolean(heading?.includes('cacaPalavras')), heading ?? 'sem título');
  await context.setOffline(false);
} catch {
  await check('app abre offline', false, 'service worker não assumiu o controle');
}

// ── Sem erros de console ────────────────────────────────────────────────────
await check('sem erros de console', consoleErrors.length === 0, consoleErrors.join(' | '));

await browser.close();

console.log(`\n${failures.length === 0 ? 'Tudo certo.' : `${failures.length} verificação(ões) falharam.`}`);
if (failures.length > 0) process.exitCode = 1;
