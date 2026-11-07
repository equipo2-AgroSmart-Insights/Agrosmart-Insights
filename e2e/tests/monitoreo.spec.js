// @ts-check
const { test, expect } = require('@playwright/test');

test('el microfrontend de Monitoreo Satelital carga correctamente', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Monitoreo Satelital').click();

  // Si el microfrontend no está bien desplegado (el mismo tipo de incidente
  // que ya tuvimos con chat/monitoreo/mercados — URL mal configurada,
  // proyecto de Vercel caído, etc.), esto nunca va a aparecer.
  await expect(page.getByText('OBSERVATORIO AGRÍCOLA')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Monitoreo Satelital' })).toBeVisible();
  await expect(page.getByPlaceholder(/Buscar región o zona productora/i).or(
    page.getByText('Buscar región o zona productora')
  )).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText.toLowerCase()).not.toContain('microfrontend no disponible');
});
