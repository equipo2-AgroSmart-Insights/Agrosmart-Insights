// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Módulo de Comparación de Mercados MIDAGRI (GMML vs MMF2)', () => {
  test('carga el microfrontend de Mercados MIDAGRI y permite comparar productos', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Mercados MIDAGRI').click();

    // Validar título y elementos principales de la vista
    await expect(page.getByRole('heading', { name: /Comparativa de Mercados: GMML vs. MMF2/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Gran Mercado Mayorista (GMML)')).toBeVisible();
    await expect(page.getByText('Mercado de Frutas N° 2 (MMF2)')).toBeVisible();

    // Criterio 1: Selector de producto y presencia de ID Maestro
    await expect(page.getByText(/ID Maestro:/i)).toBeVisible();

    // Criterio 2: Presencia de filtros dinámicos por horizonte temporal
    await expect(page.getByRole('button', { name: 'Semana' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trimestre' })).toBeVisible();

    // Validar que se muestre la tabla comparativa diaria
    await expect(page.getByRole('heading', { name: /Tabla Comparativa Diaria Homologada/i })).toBeVisible();

    // Validar que el cuerpo no contenga error de microfrontend
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('microfrontend no disponible');
  });
});

