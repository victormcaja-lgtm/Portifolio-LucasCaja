// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthEnv } from "./auth-env";

/**
 * TASK-05: `getAuthEnv(env?)` valida as variáveis da autenticação, separada de `getServerEnv`
 * (o build e as páginas públicas não exigem variáveis de autenticação).
 */
const SECRET_32 = "s".repeat(32);
const SECRET_LONG = "segredo-de-teste-unitario-0123456789-abcdef";

function captureError(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return error as Error;
  }
  throw new Error("esperava que a função lançasse um erro");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthEnv — variáveis obrigatórias", () => {
  it("retorna secret, baseURL e trustedOrigins a partir de BETTER_AUTH_SECRET e BETTER_AUTH_URL", () => {
    const result = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET_LONG,
      BETTER_AUTH_URL: "http://localhost:3000",
    } as unknown as NodeJS.ProcessEnv);
    expect(result).toEqual({
      secret: SECRET_LONG,
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
    });
  });

  it("não exige DATABASE_URL nem outras variáveis do servidor", () => {
    expect(() =>
      getAuthEnv({
        BETTER_AUTH_SECRET: SECRET_LONG,
        BETTER_AUTH_URL: "https://lucascaja.com",
      } as unknown as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("BETTER_AUTH_SECRET ausente → erro citando o nome da variável", () => {
    const error = captureError(() =>
      getAuthEnv({ BETTER_AUTH_URL: "http://localhost:3000" } as unknown as NodeJS.ProcessEnv),
    );
    expect(error.message).toMatch(/BETTER_AUTH_SECRET/);
  });

  it("BETTER_AUTH_SECRET vazia → erro citando o nome da variável", () => {
    const error = captureError(() =>
      getAuthEnv({
        BETTER_AUTH_SECRET: "",
        BETTER_AUTH_URL: "http://localhost:3000",
      } as unknown as NodeJS.ProcessEnv),
    );
    expect(error.message).toMatch(/BETTER_AUTH_SECRET/);
  });

  it("BETTER_AUTH_SECRET com 31 caracteres → erro citando a variável, sem o valor", () => {
    const shortSecret = "CURTO-SEGREDO-".padEnd(31, "x");
    expect(shortSecret).toHaveLength(31);
    const error = captureError(() =>
      getAuthEnv({
        BETTER_AUTH_SECRET: shortSecret,
        BETTER_AUTH_URL: "http://localhost:3000",
      } as unknown as NodeJS.ProcessEnv),
    );
    expect(error.message).toMatch(/BETTER_AUTH_SECRET/);
    expect(error.message).not.toContain(shortSecret);
    expect(error.message).not.toContain("CURTO-SEGREDO");
  });

  it("BETTER_AUTH_SECRET com exatamente 32 caracteres é aceita", () => {
    const result = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET_32,
      BETTER_AUTH_URL: "http://localhost:3000",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.secret).toBe(SECRET_32);
  });

  it("sem BETTER_AUTH_URL e sem VERCEL_URL → erro citando BETTER_AUTH_URL", () => {
    const error = captureError(() =>
      getAuthEnv({ BETTER_AUTH_SECRET: SECRET_LONG } as unknown as NodeJS.ProcessEnv),
    );
    expect(error.message).toMatch(/BETTER_AUTH_URL/);
    expect(error.message).not.toContain(SECRET_LONG);
  });

  it("as mensagens de erro nunca incluem o valor do segredo", () => {
    const secret = "VALOR-SECRETO-QUE-NAO-PODE-VAZAR-0123456789";
    const error = captureError(() =>
      getAuthEnv({ BETTER_AUTH_SECRET: secret } as unknown as NodeJS.ProcessEnv),
    );
    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain("VALOR-SECRETO");
  });
});

describe("getAuthEnv — fallback para VERCEL_URL (previews da Vercel)", () => {
  it("sem BETTER_AUTH_URL, usa https://${VERCEL_URL} como baseURL", () => {
    const result = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET_LONG,
      VERCEL_URL: "portfolio-git-feature-abc.vercel.app",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.baseURL).toBe("https://portfolio-git-feature-abc.vercel.app");
    expect(result.trustedOrigins).toContain("https://portfolio-git-feature-abc.vercel.app");
    expect(new Set(result.trustedOrigins).size).toBe(result.trustedOrigins.length);
  });

  it("BETTER_AUTH_URL vazia é tratada como ausente (cai em VERCEL_URL)", () => {
    const result = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET_LONG,
      BETTER_AUTH_URL: "",
      VERCEL_URL: "preview-xyz.vercel.app",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.baseURL).toBe("https://preview-xyz.vercel.app");
  });

  it("com as duas, baseURL é BETTER_AUTH_URL e trustedOrigins inclui também https://${VERCEL_URL}", () => {
    const result = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET_LONG,
      BETTER_AUTH_URL: "https://lucascaja.com",
      VERCEL_URL: "portfolio-abc.vercel.app",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.baseURL).toBe("https://lucascaja.com");
    expect(result.trustedOrigins).toEqual(
      expect.arrayContaining(["https://lucascaja.com", "https://portfolio-abc.vercel.app"]),
    );
    expect(result.trustedOrigins).toHaveLength(2);
  });

  it("sem VERCEL_URL, trustedOrigins contém só a baseURL", () => {
    const result = getAuthEnv({
      BETTER_AUTH_SECRET: SECRET_LONG,
      BETTER_AUTH_URL: "https://lucascaja.com",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.trustedOrigins).toEqual(["https://lucascaja.com"]);
  });
});

describe("getAuthEnv — sem argumento lê process.env", () => {
  it("usa process.env quando nenhum objeto é passado", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", SECRET_LONG);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100");
    vi.stubEnv("VERCEL_URL", "");
    expect(getAuthEnv()).toEqual({
      secret: SECRET_LONG,
      baseURL: "http://localhost:3100",
      trustedOrigins: ["http://localhost:3100"],
    });
  });

  it("process.env sem BETTER_AUTH_SECRET → erro citando a variável", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100");
    expect(() => getAuthEnv()).toThrow(/BETTER_AUTH_SECRET/);
  });
});
