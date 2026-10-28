import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, APP_URL, AUTH_STATE, MOCK_URL, appEnv, mockEnv } from "./e2e/env";

const isCI = Boolean(process.env.CI);
// sin `pnpm exec`: lanza el servidor en otro grupo de procesos y Playwright no podría cerrarlo al terminar
const NEXT_BIN = "node node_modules/next/dist/bin/next";

/*
 * Tests E2E: Chromium contra un build de producción de la app, una base
 * `<nombre>_e2e_test` y un Mercado Pago simulado (e2e/mock-mercadopago.mjs).
 * En serie: todos comparten el mismo usuario y la misma base de datos.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: APP_URL,
    locale: "es-PE",
    timezoneId: "America/Lima",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-mercadopago.mjs",
      url: `${MOCK_URL}/__control/state`,
      env: mockEnv,
      reuseExistingServer: !isCI,
    },
    {
      command: `${NEXT_BIN} build && exec ${NEXT_BIN} start -p ${APP_PORT}`,
      url: APP_URL,
      env: appEnv,
      timeout: 300_000,
      reuseExistingServer: !isCI,
    },
  ],
});
