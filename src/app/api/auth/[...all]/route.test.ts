// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TASK-05: `src/app/api/auth/[...all]/route.ts` usa `toNextJsHandler` com a instância criada
 * na primeira requisição. Importar o módulo (o que o build faz) não pode chamar `getAuth()`.
 */
const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  handler: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  getAuth: mocks.getAuth,
  setResetLinkSink: vi.fn(),
}));

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

beforeEach(() => {
  mocks.getAuth.mockReset();
  mocks.handler.mockReset();
  mocks.handler.mockImplementation(async () => new Response("ok", { status: 200 }));
  mocks.getAuth.mockImplementation(() => ({ handler: mocks.handler, api: {} }));
});

describe("rota /api/auth/[...all]", () => {
  it("CA-7: importar a rota não cria a instância do Better Auth", async () => {
    await loadRoute();
    expect(mocks.getAuth).not.toHaveBeenCalled();
  });

  it("exporta GET e POST", async () => {
    const route = await loadRoute();
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
  });

  it("GET delega a requisição ao handler da instância", async () => {
    const route = await loadRoute();
    const request = new Request("http://localhost:3100/api/auth/get-session");
    const response = await route.GET(request as never);
    expect(mocks.getAuth).toHaveBeenCalled();
    expect(mocks.handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it("POST delega a requisição ao handler da instância", async () => {
    const route = await loadRoute();
    const request = new Request("http://localhost:3100/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: "a@exemplo.test", password: "x" }),
      headers: { "content-type": "application/json" },
    });
    await route.POST(request as never);
    expect(mocks.handler).toHaveBeenCalledWith(request);
  });
});
