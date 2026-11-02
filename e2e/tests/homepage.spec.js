// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Página principal', () => {
  test('carga con el título correcto y el menú lateral completo', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('AgroSmart Insights');

    // El menú lateral es lo primero que renderiza la app — si falta algo acá,
    // algo se rompió en el build o en el deploy del shell.
    await expect(page.getByText('Nueva Consulta')).toBeVisible();
    await expect(page.getByText('Mercados MIDAGRI')).toBeVisible();
    await expect(page.getByText('Monitoreo Satelital')).toBeVisible();
    await expect(page.getByText('Calendario Agrícola')).toBeVisible();
  });

  test('muestra el cuadro de consulta y las consultas sugeridas', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByPlaceholder('Ej. ¿Debo vender mi cosecha de papa hoy o esperar?')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Consultar/i })).toBeVisible();

    // Las consultas sugeridas son contenido editorial (puede cambiar su
    // redacción con el tiempo, ej. PR #99 de gráficos en el chat) — se
    // valida la sección en sí, no textos exactos que puedan rotar.
    await expect(page.getByText('CONSULTAS SUGERIDAS')).toBeVisible();
  });
});
