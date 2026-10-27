// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getContentSource } from "./content-source";

const URL_LOCAL = "postgresql://portfolio:SENHA-SECRETA@localhost:5434/portfolio?schema=public";

function env(vars: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...vars } as NodeJS.ProcessEnv;
}

describe("TASK-04b: getContentSource (src/server/content-source.ts)", () => {
  it('DATABASE_URL definida e não vazia → "database"', () => {
    expect(getContentSource(env({ DATABASE_URL: URL_LOCAL }))).toBe("database");
  });

  it('DATABASE_URL ausente → "demo"', () => {
    expect(getContentSource(env({}))).toBe("demo");
  });

  it('DATABASE_URL string vazia → "demo"', () => {
    expect(getContentSource(env({ DATABASE_URL: "" }))).toBe("demo");
  });

  it('DATABASE_URL só com espaços → "demo" (trim)', () => {
    expect(getContentSource(env({ DATABASE_URL: "   \t " }))).toBe("demo");
  });

  it('DATABASE_URL com espaços ao redor de um valor → "database"', () => {
    expect(getContentSource(env({ DATABASE_URL: `  ${URL_LOCAL}  ` }))).toBe("database");
  });

  it('VERCEL_ENV=preview sem DATABASE_URL → "demo"', () => {
    expect(getContentSource(env({ VERCEL_ENV: "preview" }))).toBe("demo");
  });

  it('VERCEL_ENV=development com DATABASE_URL vazia → "demo"', () => {
    expect(getContentSource(env({ VERCEL_ENV: "development", DATABASE_URL: "" }))).toBe("demo");
  });

  it('VERCEL_ENV=production com DATABASE_URL → "database"', () => {
    expect(getContentSource(env({ VERCEL_ENV: "production", DATABASE_URL: URL_LOCAL }))).toBe(
      "database",
    );
  });

  it("CA-03: VERCEL_ENV=production sem DATABASE_URL → lança Error citando a variável", () => {
    expect(() => getContentSource(env({ VERCEL_ENV: "production" }))).toThrow(Error);
    expect(() => getContentSource(env({ VERCEL_ENV: "production" }))).toThrow(/DATABASE_URL/);
  });

  it("CA-03: VERCEL_ENV=production com DATABASE_URL vazia ou só espaços → lança Error", () => {
    expect(() => getContentSource(env({ VERCEL_ENV: "production", DATABASE_URL: "" }))).toThrow(
      /DATABASE_URL/,
    );
    expect(() =>
      getContentSource(env({ VERCEL_ENV: "production", DATABASE_URL: "   " })),
    ).toThrow(/DATABASE_URL/);
  });

  it("CA-08: a mensagem de erro em produção não inclui valores de variáveis", () => {
    const secret = "valor-SECRETO-de-outra-variavel";
    let error: unknown;
    try {
      getContentSource(
        env({ VERCEL_ENV: "production", DATABASE_URL: "  ", DATABASE_URL_UNPOOLED: secret }),
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(secret);
  });

  describe("sem argumento, lê process.env", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('process.env.DATABASE_URL definida → "database"', () => {
      vi.stubEnv("VERCEL_ENV", "");
      vi.stubEnv("DATABASE_URL", URL_LOCAL);
      expect(getContentSource()).toBe("database");
    });

    it('process.env.DATABASE_URL vazia → "demo"', () => {
      vi.stubEnv("VERCEL_ENV", "");
      vi.stubEnv("DATABASE_URL", "");
      expect(getContentSource()).toBe("demo");
    });

    it("process.env em produção sem DATABASE_URL → lança", () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("DATABASE_URL", undefined);
      expect(() => getContentSource()).toThrow(/DATABASE_URL/);
    });
  });
});
