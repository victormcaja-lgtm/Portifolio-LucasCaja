// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * TASK-04b: prisma.config.ts usa DATABASE_URL_UNPOOLED (conexão direta, para as migrações)
 * quando existe; senão, DATABASE_URL. As variáveis são definidas antes do import; o carregamento
 * de .env do config nunca sobrescreve variáveis já definidas.
 */
const saved = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
};

function restore(name: keyof typeof saved) {
  if (saved[name] === undefined) delete process.env[name];
  else process.env[name] = saved[name];
}

afterEach(() => {
  restore("DATABASE_URL");
  restore("DATABASE_URL_UNPOOLED");
});

async function datasourceUrl(): Promise<unknown> {
  vi.resetModules();
  const { default: config } = (await import("../prisma.config")) as {
    default: { datasource?: { url?: unknown } };
  };
  return config.datasource?.url;
}

describe("TASK-04b: prisma.config.ts — URL das migrações", () => {
  it("usa DATABASE_URL_UNPOOLED quando definida", async () => {
    process.env.DATABASE_URL = "postgresql://pooled.example/db";
    process.env.DATABASE_URL_UNPOOLED = "postgresql://direct.example/db";
    expect(await datasourceUrl()).toBe("postgresql://direct.example/db");
  });

  it("sem DATABASE_URL_UNPOOLED, usa DATABASE_URL", async () => {
    process.env.DATABASE_URL = "postgresql://pooled.example/db";
    process.env.DATABASE_URL_UNPOOLED = "";
    expect(await datasourceUrl()).toBe("postgresql://pooled.example/db");
  });

  it("DATABASE_URL_UNPOOLED só com espaços é ignorada", async () => {
    process.env.DATABASE_URL = "postgresql://pooled.example/db";
    process.env.DATABASE_URL_UNPOOLED = "   ";
    expect(await datasourceUrl()).toBe("postgresql://pooled.example/db");
  });
});
