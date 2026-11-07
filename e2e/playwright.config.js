// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Pruebas de humo E2E contra producción real (no contra un servidor local).
// El plan free de Render "duerme" el backend por inactividad — el primer
// request después de un rato puede tardar 50s o más en responder. Por eso
// los timeouts acá son generosos a propósito, no por tests lentos.
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 150_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://agrosmart-insights.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
