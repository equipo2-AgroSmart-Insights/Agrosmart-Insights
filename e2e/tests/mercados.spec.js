// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Módulo de Comparación de Mercados MIDAGRI (GMML vs MMF2)', () => {
  test('carga el microfrontend de Mercados MIDAGRI con sus controles', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Mercados MIDAGRI').click();

    // Solo la parte estable del título: ya cambió una vez ("Comparativa de
    // Mercados" → "Comparativa de Precios") y el test quedó en rojo 8 días.
    await expect(page.getByRole('heading', { name: /GMML vs\.? MMF2/i })).toBeVisible({ timeout: 20_000 });

    // Criterio 1: búsqueda de producto
    await expect(page.getByPlaceholder(/nombre del producto/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeVisible();

    // Criterio 2: filtros por horizonte temporal
    for (const horizonte of ['Semana', 'Mes', 'Trimestre']) {
      await expect(page.getByRole('button', { name: horizonte, exact: true })).toBeVisible();
    }

    // Antes de buscar, la vista pide elegir un producto. Las tarjetas GMML/MMF2,
    // el ID maestro y la tabla comparativa aparecen recién después de una
    // búsqueda, que depende de WF2 en vivo; aquí solo se valida que el
    // microfrontend cargó.
    await expect(page.getByText(/selecciona un producto/i)).toBeVisible();

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).not.toContain('microfrontend no disponible');
  });
});
