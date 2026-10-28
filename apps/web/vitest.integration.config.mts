import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
 * Tests de integración: Route Handlers reales contra un Postgres real (base
 * `<nombre>_test`, creada y migrada en el arranque). Sólo se simulan la
 * pasarela de pago y la sesión. Van en serie: comparten la base de datos.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["./src/test/integration/global-setup.ts"],
    setupFiles: ["./src/test/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: { LOG_LEVEL: "silent" },
  },
});
