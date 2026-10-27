import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SECRET, E2E_DATABASE_URL } from "./tests/e2e/auth-fixtures";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E (TASK-03): build de produção servido por `next start` na porta 3100.
 * Dois projetos: desktop (Chromium 1440×900) e mobile (Chromium com o dispositivo Pixel 7).
 *
 * TASK-05: o global setup cria/atualiza o OWNER de teste no banco local. O servidor recebe
 * variáveis SÓ de teste: BETTER_AUTH_URL = a URL do E2E, sempre o BETTER_AUTH_SECRET de teste
 * (E2E_AUTH_SECRET, mesmo que o ambiente defina outro; o .env não é lido aqui) e o mesmo
 * DATABASE_URL local do global setup.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Inclui o tempo do `next build`.
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      BETTER_AUTH_URL: BASE_URL,
      // Sempre o segredo de teste (ciclo 2, item 8): nunca o BETTER_AUTH_SECRET do ambiente.
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      DATABASE_URL: E2E_DATABASE_URL,
    },
  },
});
