// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * O script não pode executar comandos de verdade ao ser importado pelo teste:
 * `spawnSync` é substituído por um mock e `process.exit` é neutralizado.
 */
const { spawnSyncMock } = vi.hoisted(() => ({
  spawnSyncMock: vi.fn(() => ({ status: 0, signal: null })),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, default: { ...actual, spawnSync: spawnSyncMock }, spawnSync: spawnSyncMock };
});
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, default: { ...actual, spawnSync: spawnSyncMock }, spawnSync: spawnSyncMock };
});

type PlanBuildSteps = (env: NodeJS.ProcessEnv) => string[][];
let planBuildSteps: PlanBuildSteps;
let exitSpy: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  ({ planBuildSteps } = (await import("../scripts/vercel-build")) as {
    planBuildSteps: PlanBuildSteps;
  });
});

afterAll(() => {
  exitSpy.mockRestore();
});

function env(vars: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...vars } as NodeJS.ProcessEnv;
}

const asText = (steps: string[][]) => steps.map((step) => step.join(" "));
const isMigrate = (cmd: string) => /\bprisma migrate deploy$/.test(cmd);
const isNextBuild = (cmd: string) => /\bnext build$/.test(cmd);

describe("TASK-04b: planBuildSteps (scripts/vercel-build.ts) — CA-06", () => {
  it("CA-06: em produção, roda prisma migrate deploy e depois next build", () => {
    const steps = planBuildSteps(env({ VERCEL_ENV: "production", DATABASE_URL: "x" }));
    const text = asText(steps);
    expect(steps).toHaveLength(2);
    expect(isMigrate(text[0]), text[0]).toBe(true);
    expect(isNextBuild(text[1]), text[1]).toBe(true);
  });

  it.each([
    ["preview", { VERCEL_ENV: "preview", DATABASE_URL: "x" }],
    ["development", { VERCEL_ENV: "development" }],
    ["local (sem VERCEL_ENV)", {}],
    ["VERCEL_ENV vazio", { VERCEL_ENV: "" }],
    ["valor parecido (Production)", { VERCEL_ENV: "Production" }],
  ])("CA-06: em %s, roda só next build (nunca migra)", (_label, vars) => {
    const steps = planBuildSteps(env(vars));
    const text = asText(steps);
    expect(steps).toHaveLength(1);
    expect(isNextBuild(text[0]), text[0]).toBe(true);
    expect(text.some((cmd) => cmd.includes("migrate"))).toBe(false);
  });

  it("cada passo é uma lista de strings não vazias (comando + argumentos)", () => {
    for (const steps of [
      planBuildSteps(env({ VERCEL_ENV: "production" })),
      planBuildSteps(env({})),
    ]) {
      for (const step of steps) {
        expect(step.length).toBeGreaterThan(0);
        for (const part of step) {
          expect(typeof part).toBe("string");
          expect(part.trim()).not.toBe("");
        }
      }
    }
  });

  it("planBuildSteps é pura: não executa comandos", () => {
    spawnSyncMock.mockClear();
    planBuildSteps(env({ VERCEL_ENV: "production" }));
    planBuildSteps(env({}));
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });
});
