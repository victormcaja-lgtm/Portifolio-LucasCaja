// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

/**
 * TASK-05: configuração do Better Auth em `src/server/auth.ts`.
 * `betterAuth` e `prismaAdapter` são mockados para capturar as opções; `getDb()` devolve um
 * objeto falso. A integração real (banco) fica em tests/integration/auth.test.ts.
 */
type AnyFn = (...args: never[]) => unknown;
type Options = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const mocks = vi.hoisted(() => ({
  betterAuth: vi.fn(),
  prismaAdapter: vi.fn(() => "PRISMA_ADAPTER"),
  findUser: vi.fn(),
  db: {} as Record<string, unknown>,
}));

mocks.db.user = { findUnique: mocks.findUser, findFirst: mocks.findUser };

vi.mock("better-auth", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, betterAuth: mocks.betterAuth };
});

vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: mocks.prismaAdapter }));

vi.mock("@/server/db", () => ({ getDb: () => mocks.db }));

const SECRET = "segredo-de-teste-unitario-0123456789-abcdef";
const BASE_URL = "http://localhost:3100";

type AuthModule = typeof import("./auth");

async function loadAuth(): Promise<AuthModule> {
  vi.resetModules();
  return import("./auth");
}

async function loadOptions(): Promise<{ mod: AuthModule; options: Options }> {
  const mod = await loadAuth();
  mod.getAuth();
  expect(mocks.betterAuth).toHaveBeenCalledTimes(1);
  const [options] = mocks.betterAuth.mock.calls[0] as [Options];
  return { mod, options };
}

/** Executa `fn` e resolve com o resultado, ou com `{ thrown }` se lançar (síncrono ou assíncrono). */
async function settle(fn: () => unknown): Promise<{ value?: unknown; thrown?: unknown }> {
  try {
    return { value: await fn() };
  } catch (thrown) {
    return { thrown };
  }
}

let consoleSpies: MockInstance[] = [];

beforeEach(() => {
  mocks.betterAuth.mockReset();
  mocks.betterAuth.mockImplementation((options: Options) => ({
    options,
    api: {},
    handler: vi.fn(),
  }));
  mocks.prismaAdapter.mockClear();
  mocks.findUser.mockReset();
  vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
  vi.stubEnv("BETTER_AUTH_URL", BASE_URL);
  vi.stubEnv("VERCEL_URL", "");
  consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => {}),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  for (const spy of consoleSpies) spy.mockRestore();
});

describe("getAuth — singleton preguiçoso", () => {
  it("importar o módulo não cria a instância nem lê variáveis (build sem variáveis passa)", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);
    vi.stubEnv("BETTER_AUTH_URL", undefined);
    await loadAuth();
    expect(mocks.betterAuth).not.toHaveBeenCalled();
    expect(mocks.prismaAdapter).not.toHaveBeenCalled();
  });

  it("chamadas repetidas devolvem a mesma instância (betterAuth chamado uma vez)", async () => {
    const mod = await loadAuth();
    const first = mod.getAuth();
    const second = mod.getAuth();
    expect(first).toBe(second);
    expect(mocks.betterAuth).toHaveBeenCalledTimes(1);
  });

  it("sem BETTER_AUTH_SECRET, getAuth() lança erro citando a variável", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);
    const mod = await loadAuth();
    expect(() => mod.getAuth()).toThrow(/BETTER_AUTH_SECRET/);
  });
});

describe("getAuth — opções do Better Auth", () => {
  it("usa prismaAdapter(getDb(), { provider: 'postgresql' })", async () => {
    const { options } = await loadOptions();
    expect(mocks.prismaAdapter).toHaveBeenCalledWith(
      mocks.db,
      expect.objectContaining({ provider: "postgresql" }),
    );
    expect(options.database).toBe("PRISMA_ADAPTER");
  });

  it("secret, baseURL e trustedOrigins vêm de getAuthEnv", async () => {
    vi.stubEnv("VERCEL_URL", "preview-abc.vercel.app");
    const { options } = await loadOptions();
    expect(options.secret).toBe(SECRET);
    expect(options.baseURL).toBe(BASE_URL);
    expect(options.trustedOrigins).toEqual(
      expect.arrayContaining([BASE_URL, "https://preview-abc.vercel.app"]),
    );
  });

  it("CA-1: emailAndPassword habilitado, sem cadastro, senha 12–128, sem autoSignIn", async () => {
    const { options } = await loadOptions();
    expect(options.emailAndPassword).toMatchObject({
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    });
  });

  it("CA-2: o token de redefinição expira em 60 minutos", async () => {
    const { options } = await loadOptions();
    expect(options.emailAndPassword.resetPasswordTokenExpiresIn ?? 3600).toBe(3600);
  });

  it("role e banned são additionalFields com input: false", async () => {
    const { options } = await loadOptions();
    const fields = options.user?.additionalFields ?? {};
    expect(fields.role).toMatchObject({ input: false });
    expect(fields.banned).toMatchObject({ input: false });
  });

  it("CA-6: rateLimit ativo em banco, com regra de 5 tentativas/60 s em /sign-in/email", async () => {
    const { options } = await loadOptions();
    expect(options.rateLimit).toMatchObject({ enabled: true, storage: "database" });
    expect(options.rateLimit.customRules["/sign-in/email"]).toEqual({ window: 60, max: 5 });
  });

  it("CA-6: rateLimit tem regra rígida para /reset-password", async () => {
    const { options } = await loadOptions();
    const rule = options.rateLimit.customRules["/reset-password"];
    expect(rule).toBeTruthy();
    expect(rule.window).toBeGreaterThanOrEqual(60);
    expect(rule.max).toBeLessThanOrEqual(5);
  });

  it("ciclo 2, item 5: a instância do app desativa /request-password-reset (disabledPaths)", async () => {
    const { options } = await loadOptions();
    expect(options.disabledPaths).toEqual(expect.arrayContaining(["/request-password-reset"]));
    // O consumo do token continua ativo.
    expect(options.disabledPaths).not.toContain("/reset-password");
  });

  it("ciclo 2, item 6: redefinir a senha revoga as sessões existentes", async () => {
    const { options } = await loadOptions();
    expect(options.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true);
  });

  it("ciclo 2, item 7: IP do cliente lido de x-vercel-forwarded-for e x-forwarded-for", async () => {
    const { options } = await loadOptions();
    expect(options.advanced?.ipAddress?.ipAddressHeaders).toEqual([
      "x-vercel-forwarded-for",
      "x-forwarded-for",
    ]);
  });

  it("sessão expira em 7 dias e é renovada diariamente", async () => {
    const { options } = await loadOptions();
    expect(options.session).toMatchObject({
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    });
  });
});

describe("CA-5: databaseHooks.session.create.before recusa usuário banido", () => {
  const session = {
    userId: "user_1",
    token: "tok",
    expiresAt: new Date(Date.now() + 60_000),
  };

  function contextFor(user: Record<string, unknown> | null) {
    return {
      context: {
        internalAdapter: {
          findUserById: vi.fn(async () => user),
        },
      },
    };
  }

  async function runHook(user: Record<string, unknown> | null) {
    mocks.findUser.mockResolvedValue(user);
    const { options } = await loadOptions();
    const before = options.databaseHooks?.session?.create?.before as AnyFn | undefined;
    expect(typeof before).toBe("function");
    return settle(() => (before as (...args: unknown[]) => unknown)(session, contextFor(user)));
  }

  it("usuário banido: a sessão é recusada (retorna false ou lança)", async () => {
    const result = await runHook({ id: "user_1", email: "a@exemplo.test", banned: true });
    expect(result.thrown !== undefined || result.value === false).toBe(true);
  });

  it("usuário banido: o erro (se houver) é genérico e não revela o motivo", async () => {
    const result = await runHook({ id: "user_1", email: "a@exemplo.test", banned: true });
    if (result.thrown !== undefined) {
      const text = `${(result.thrown as Error)?.message ?? ""} ${JSON.stringify(result.thrown)}`;
      expect(text).not.toMatch(/ban|bloque|suspens/i);
    }
  });

  it("usuário ativo: a sessão é criada normalmente", async () => {
    const result = await runHook({ id: "user_1", email: "a@exemplo.test", banned: false });
    expect(result.thrown).toBeUndefined();
    expect(result.value).not.toBe(false);
  });
});

describe("sendResetPassword e setResetLinkSink", () => {
  const payload = {
    user: { id: "user_1", email: "dono@exemplo.test", name: "Dono" },
    url: `${BASE_URL}/api/auth/reset-password/TOKEN-SECRETO-123?callbackURL=%2Fadmin%2Fdefinir-senha`,
    token: "TOKEN-SECRETO-123",
  };

  function loggedText(): string {
    return consoleSpies
      .flatMap((spy) => spy.mock.calls.flat())
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join("\n");
  }

  it("sem sink registrado: lança 'envio de e-mail não configurado' e não registra o link em log", async () => {
    const { mod, options } = await loadOptions();
    mod.setResetLinkSink(null);
    const send = options.emailAndPassword.sendResetPassword as (...args: unknown[]) => unknown;
    const result = await settle(() => send(payload, undefined));
    expect(result.thrown).toBeInstanceOf(Error);
    expect((result.thrown as Error).message).toMatch(/envio de e-mail não configurado/i);
    expect((result.thrown as Error).message).not.toContain(payload.token);
    expect(loggedText()).not.toContain(payload.token);
  });

  it("com sink registrado: delega o token e o e-mail ao sink, sem log", async () => {
    const { mod, options } = await loadOptions();
    const sink = vi.fn();
    mod.setResetLinkSink(sink);
    const send = options.emailAndPassword.sendResetPassword as (...args: unknown[]) => unknown;
    await send(payload, undefined);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ token: payload.token, email: payload.user.email }),
    );
    expect(loggedText()).not.toContain(payload.token);
    mod.setResetLinkSink(null);
  });

  it("setResetLinkSink(null) remove o sink", async () => {
    const { mod, options } = await loadOptions();
    const sink = vi.fn();
    mod.setResetLinkSink(sink);
    mod.setResetLinkSink(null);
    const send = options.emailAndPassword.sendResetPassword as (...args: unknown[]) => unknown;
    const result = await settle(() => send(payload, undefined));
    expect(result.thrown).toBeInstanceOf(Error);
    expect(sink).not.toHaveBeenCalled();
  });
});
