// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { E2E_AUTH_SECRET } from "./e2e/auth-fixtures";

/**
 * TASK-05, ciclo de correção 2, item 8: o servidor do E2E usa SEMPRE o segredo de teste
 * (E2E_AUTH_SECRET), nunca o BETTER_AUTH_SECRET do ambiente.
 * `@playwright/test` é mockado: só interessa o objeto de configuração.
 */
vi.mock("@playwright/test", () => ({
  defineConfig: <T>(config: T) => config,
  devices: { "Desktop Chrome": {}, "Pixel 7": {} },
}));

type WebServer = { env?: Record<string, string> };

async function loadConfig(): Promise<{ webServer?: WebServer | WebServer[] }> {
  vi.resetModules();
  const mod = await import("../playwright.config");
  return mod.default as { webServer?: WebServer | WebServer[] };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("playwright.config — webServer", () => {
  it.each([
    ["com BETTER_AUTH_SECRET real no ambiente", "segredo-real-que-nao-pode-vazar-0123456789"],
    ["sem BETTER_AUTH_SECRET no ambiente", undefined],
  ])("ciclo 2, item 8: %s → usa E2E_AUTH_SECRET", async (_label, envSecret) => {
    vi.stubEnv("BETTER_AUTH_SECRET", envSecret);
    const config = await loadConfig();
    const servers = Array.isArray(config.webServer) ? config.webServer : [config.webServer];
    expect(servers.length).toBeGreaterThan(0);
    for (const server of servers) {
      expect(server?.env?.BETTER_AUTH_SECRET).toBe(E2E_AUTH_SECRET);
    }
  });
});
