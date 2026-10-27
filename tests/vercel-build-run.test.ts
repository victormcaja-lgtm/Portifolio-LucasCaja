// @vitest-environment node
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * TASK-04b (CA-06): execução de scripts/vercel-build.ts como ponto de entrada.
 * `process.argv[1]` aponta para o script, para que ele rode `run(planBuildSteps(process.env))`
 * ao ser importado. `spawnSync` é um mock (nenhum comando real roda) e `process.exit` lança um
 * erro identificável, para interromper a execução como o exit real faria.
 */
type SpawnResult = { status: number | null; signal: null; error?: Error };

const { spawnSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn<(...args: unknown[]) => SpawnResult>(),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, default: { ...actual, spawnSync: spawnSyncMock }, spawnSync: spawnSyncMock };
});

const SCRIPT = path.resolve(import.meta.dirname, "../scripts/vercel-build.ts");

class ExitCalled extends Error {
  constructor(public code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

const originalArgv = process.argv;
const originalVercelEnv = process.env.VERCEL_ENV;

/** Linha de comando de cada chamada a spawnSync, independente da plataforma (com ou sem shell). */
function spawnedCommands(): string[] {
  return spawnSyncMock.mock.calls.map(([command, argsOrOptions]) =>
    Array.isArray(argsOrOptions) ? [command, ...argsOrOptions].join(" ") : String(command),
  );
}

async function runScript(): Promise<number | undefined | "completed"> {
  vi.resetModules();
  process.argv = [originalArgv[0], SCRIPT];
  try {
    await import("../scripts/vercel-build");
    return "completed";
  } catch (error) {
    if (error instanceof ExitCalled) return error.code;
    throw error;
  }
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  spawnSyncMock.mockReset();
  spawnSyncMock.mockReturnValue({ status: 0, signal: null });
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new ExitCalled(code);
  }) as never);
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  process.argv = originalArgv;
  if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = originalVercelEnv;
  vi.restoreAllMocks();
});

describe("TASK-04b: scripts/vercel-build.ts como ponto de entrada (CA-06)", () => {
  it("CA-06: em produção, executa migrate deploy e depois next build, com stdio herdado", async () => {
    process.env.VERCEL_ENV = "production";
    expect(await runScript()).toBe("completed");

    const commands = spawnedCommands();
    expect(commands).toHaveLength(2);
    expect(commands[0]).toMatch(/\bprisma migrate deploy$/);
    expect(commands[1]).toMatch(/\bnext build$/);
    for (const call of spawnSyncMock.mock.calls) {
      const options = call.find((arg) => typeof arg === "object" && arg !== null && !Array.isArray(arg));
      expect(options).toMatchObject({ stdio: "inherit" });
    }
  });

  it("CA-06: fora de produção, executa só next build", async () => {
    process.env.VERCEL_ENV = "preview";
    expect(await runScript()).toBe("completed");

    const commands = spawnedCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatch(/\bnext build$/);
    expect(commands.some((cmd) => cmd.includes("migrate"))).toBe(false);
  });

  it("CA-06: se a migração falha, encerra com o código do comando e não roda o build", async () => {
    process.env.VERCEL_ENV = "production";
    spawnSyncMock.mockReturnValueOnce({ status: 3, signal: null });

    expect(await runScript()).toBe(3);
    expect(spawnedCommands()).toHaveLength(1);
  });

  it("CA-06: se o next build falha, encerra com o código do comando", async () => {
    process.env.VERCEL_ENV = "preview";
    spawnSyncMock.mockReturnValueOnce({ status: 2, signal: null });

    expect(await runScript()).toBe(2);
  });

  it("status nulo (processo morto por sinal) encerra com código diferente de zero", async () => {
    process.env.VERCEL_ENV = "preview";
    spawnSyncMock.mockReturnValueOnce({ status: null, signal: null });

    const code = await runScript();
    expect(typeof code).toBe("number");
    expect(code).not.toBe(0);
  });

  it("CA-08: falha ao iniciar o comando encerra com erro, sem vazar a mensagem do erro", async () => {
    process.env.VERCEL_ENV = "preview";
    const secret = "postgresql://user:senha-secreta@host/db";
    spawnSyncMock.mockReturnValueOnce({ status: null, signal: null, error: new Error(secret) });

    const code = await runScript();
    expect(code).not.toBe(0);
    expect(code).not.toBe("completed");
    const logged = [...errorSpy.mock.calls, ...logSpy.mock.calls].flat().map(String).join("\n");
    expect(logged).not.toContain("senha-secreta");
  });

  it("importado por outro módulo (não é o ponto de entrada), não executa nada", async () => {
    vi.resetModules();
    process.argv = [originalArgv[0], path.resolve(import.meta.dirname, "outro.ts")];
    await import("../scripts/vercel-build");
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });
});
