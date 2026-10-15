// @ts-check
const { test, expect } = require('@playwright/test');

// Esta es la prueba más importante: confirma que todo el camino real
// (frontend -> microfrontend de chat -> webhook de n8n -> LLM -> respuesta
// en pantalla) funciona de punta a punta, no solo que cada pieza por
// separado responda HTTP 200. El healthcheck de cada 6h ya cubre eso;
// esto cubre la experiencia real de un agricultor usando el chat.
test('el chat responde de punta a punta a una consulta real', async ({ page }) => {
  await page.goto('/');

  const input = page.getByPlaceholder('Ej. ¿Debo vender mi cosecha de papa hoy o esperar?');
  await input.fill('cual es el precio de la papa hoy');
  await page.getByRole('button', { name: /Consultar/i }).click();

  // Confirma que el estado de carga realmente aparece (si no aparece nunca,
  // es señal de que el click no disparó nada).
  await expect(page.getByText(/Analizando tu consulta/i)).toBeVisible({ timeout: 10_000 });

  // El plan free de Render puede tardar 50s+ en despertar más el tiempo
  // real del LLM — por eso el timeout generoso, no es un test lento a propósito.
  await expect(page.getByText(/Analizando tu consulta/i)).toBeHidden({ timeout: 140_000 });

  // No validamos el contenido exacto de la respuesta (depende del LLM y
  // de datos que cambian a diario) — validamos que haya una respuesta real
  // y sustancial, no un error ni una pantalla vacía.
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(400);
  expect(bodyText.toLowerCase()).not.toContain('error in workflow');
});
