// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Importa um módulo novo a cada teste, para não depender de eventual cache em `getServerEnv`. */
async function loadGetServerEnv() {
  vi.resetModules();
  const mod = await import("./env");
  return mod.getServerEnv;
}

describe("getServerEnv (CA-03)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("CA-03: retorna DATABASE_URL quando é uma URL postgresql:// válida", async () => {
    const url = "postgresql://user:secret@localhost:5434/portfolio?schema=public";
    vi.stubEnv("DATABASE_URL", url);
    const getServerEnv = await loadGetServerEnv();
    expect(getServerEnv()).toEqual({ DATABASE_URL: url });
  });

  it("CA-03: aceita também o esquema postgres://", async () => {
    const url = "postgres://user:secret@db.example.com:5432/portfolio";
    vi.stubEnv("DATABASE_URL", url);
    const getServerEnv = await loadGetServerEnv();
    expect(getServerEnv().DATABASE_URL).toBe(url);
  });

  it("CA-03: DATABASE_URL ausente → Error citando o nome da variável", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const getServerEnv = await loadGetServerEnv();
    expect(() => getServerEnv()).toThrow(Error);
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("CA-03: DATABASE_URL vazia → Error citando o nome da variável", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const getServerEnv = await loadGetServerEnv();
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("CA-03: valor que não é URL → Error citando a variável, sem vazar o valor", async () => {
    const secret = "isto-nao-e-url-SEGREDO-123";
    vi.stubEnv("DATABASE_URL", secret);
    const getServerEnv = await loadGetServerEnv();
    let error: unknown;
    try {
      getServerEnv();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).not.toContain(secret);
    expect(message).not.toContain("SEGREDO");
  });

  it("CA-03: URL com protocolo que não é postgres → Error, sem vazar credenciais", async () => {
    const url = "mysql://root:SENHA-SUPER-SECRETA@localhost:3306/app";
    vi.stubEnv("DATABASE_URL", url);
    const getServerEnv = await loadGetServerEnv();
    let error: unknown;
    try {
      getServerEnv();
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).not.toContain("SENHA-SUPER-SECRETA");
    expect(message).not.toContain(url);
  });

  it("CA-03: URL http(s) também é rejeitada", async () => {
    vi.stubEnv("DATABASE_URL", "https://example.com/db");
    const getServerEnv = await loadGetServerEnv();
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });
});
