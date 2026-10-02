import { test, expect, type Page } from '@playwright/test';

/**
 * Deixa o jogador morrer rápido em tempo real (spawn a cada 0,5 s), em vez de
 * falsear o relógio do navegador — isso travava o carregamento de texturas do Pixi.
 */
async function seedFastDeathOptions(page: Page, extra: Record<string, string> = {}) {
  await page.addInitScript((entries) => {
    localStorage.setItem('pirate-battle-options', JSON.stringify({ sessionTime: 60, spawnInterval: 0.5 }));
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
  }, extra);
}

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  // Espera os assets carregarem: só então o teclado e o loop do jogo estão ativos.
  await expect(page.getByText('Loading battle assets...')).toBeHidden({ timeout: 15_000 });
}

test('game starts and shows HUD', async ({ page }) => {
  await startGame(page);
  await expect(page.getByText('Hull', { exact: true })).toBeVisible();
  await expect(page.getByText('Score', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quit' }).click();
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeAttached();
});

test('Escape pauses, shows the overlay and resumes', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('.pixi-stage canvas')).toBeVisible();

  await page.keyboard.press('Escape');
  const overlay = page.getByRole('dialog', { name: 'Game paused' });
  await expect(overlay).toBeVisible();

  await overlay.getByRole('button', { name: 'Resume' }).click();
  await expect(overlay).toBeHidden();
});

test('a match ends, shows the result and registers it', async ({ page }) => {
  test.setTimeout(75_000);
  await seedFastDeathOptions(page);
  await startGame(page);
  await expect(page.getByText('Batalha completa')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Match registered successfully.')).toBeVisible();
});

test('result offers a retry when saving fails', async ({ page }) => {
  test.setTimeout(75_000);
  await seedFastDeathOptions(page, {
    'pirate-battle-network-scenario': JSON.stringify({ mode: 'error', latencyMs: 0 })
  });
  await startGame(page);
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible({ timeout: 60_000 });
});
