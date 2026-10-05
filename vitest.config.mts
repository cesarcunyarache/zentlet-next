import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // los de integración necesitan Postgres: `pnpm test:integration`
    exclude: ["src/**/*.integration.test.ts"],
    restoreMocks: true,
    // los 500 esperados de los tests no ensucian la salida
    env: { LOG_LEVEL: "silent" },
  },
});
