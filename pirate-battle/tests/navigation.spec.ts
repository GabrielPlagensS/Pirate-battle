import { test, expect } from '@playwright/test';

test('main navigation and options persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pirate Battle' })).toBeAttached();
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel(/Hora da sessão de jogo/).fill('150');
  await page.getByRole('button', { name: 'Salvar opção' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel(/Hora da sessão de jogo/)).toHaveValue('150');
});

test('options reject out-of-range values', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByLabel(/Hora da sessão de jogo/).fill('999');
  await page.getByRole('button', { name: 'Salvar opção' }).click();
  await expect(page.getByRole('alert')).toContainText('between 60 and 180');
});

test('corrupted options in localStorage fall back to safe values', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle-options', JSON.stringify({ sessionTime: 99999, spawnInterval: 'abc' }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByLabel(/Hora da sessão de jogo/)).toHaveValue('180'); // clamp ao máximo
});

test('ranking tab loads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible();
  await expect(page.getByText('Page 1 /')).toBeVisible();
});

test.describe('API mock indisponível (Service Worker perdido)', () => {
  // Sem o Service Worker, o Vite responde ao /api/ranking com o index.html (status 200).
  // Antes isso quebrava a tela com "Cannot read properties of undefined (reading 'length')".
  test.use({ serviceWorkers: 'block' });

  test('ranking mostra um erro tratável em vez de quebrar a tela', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/');
    await page.getByRole('button', { name: 'Ranking' }).click();

    await expect(page.getByRole('alert')).toContainText('Could not load ranking', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Ranking' })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
