import { NextRequest } from "next/server";
import {
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { DEMO_PROJECTS } from "@/content/demo";

/**
 * TASK-04b: o proxy consulta os slugs por `createSlugGuard({ load: getPublishedSlugs, ttlMs: 60_000 })`,
 * criado no escopo do módulo. `@/server/content` é mockado; o slug guard é o real, embrulhado
 * num espião para verificar as opções. Cada teste importa o proxy de novo (guard novo, sem cache).
 */
const mocks = vi.hoisted(() => ({
  getPublishedSlugs: vi.fn(),
  getPublishedProjects: vi.fn(),
  getPublishedProject: vi.fn(),
  getHeroImage: vi.fn(),
  createSlugGuardSpy: vi.fn(),
}));

vi.mock("@/server/content", () => ({
  getPublishedSlugs: mocks.getPublishedSlugs,
  getPublishedProjects: mocks.getPublishedProjects,
  getPublishedProject: mocks.getPublishedProject,
  getHeroImage: mocks.getHeroImage,
}));

vi.mock("@/server/slug-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/slug-guard")>();
  mocks.createSlugGuardSpy.mockImplementation(actual.createSlugGuard);
  return { ...actual, createSlugGuard: mocks.createSlugGuardSpy };
});

const ORIGIN = "https://exemplo.test";
const DEMO_SLUGS = DEMO_PROJECTS.map((p) => p.slug);

type ProxyModule = typeof import("./proxy");
let proxyModule: ProxyModule;
let errorSpy: MockInstance<typeof console.error>;

async function loadProxy(): Promise<ProxyModule> {
  vi.resetModules();
  return import("./proxy");
}

async function run(pathname: string) {
  return proxyModule.proxy(new NextRequest(`${ORIGIN}${pathname}`));
}

beforeEach(async () => {
  mocks.getPublishedSlugs.mockReset();
  mocks.createSlugGuardSpy.mockClear();
  mocks.getPublishedSlugs.mockResolvedValue(DEMO_SLUGS);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  proxyModule = await loadProxy();
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.useRealTimers();
});

describe("CA-12: proxy de 404 (src/proxy.ts)", () => {
  it.each(DEMO_SLUGS)(
    "CA-12: slug conhecido /trabalhos/%s segue adiante (next), sem rewrite",
    async (slug) => {
      const response = await run(`/trabalhos/${slug}`);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(isRewrite(response)).toBe(false);
      expect(getRewrittenUrl(response)).toBeNull();
    },
  );

  it("CA-12: slug conhecido com barra final também segue adiante", async () => {
    const response = await run("/trabalhos/estudo-i/");
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("CA-12: slug desconhecido é reescrito para /404", async () => {
    const response = await run("/trabalhos/nao-existe");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/404`);
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it("CA-12: slug vazio (/trabalhos/) é reescrito para /404", async () => {
    const response = await run("/trabalhos/");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/404`);
  });

  it("CA-12: o matcher cobre /trabalhos/<slug> e não outras rotas", () => {
    const { config } = proxyModule;
    expect(unstable_doesMiddlewareMatch({ config, url: "/trabalhos/nao-existe" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/trabalhos/estudo-i" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/sobre" })).toBe(false);
  });
});

describe("TASK-04b: proxy usa o slug guard com getPublishedSlugs (CA-01/CA-05)", () => {
  it("CA-05: cria o guard no escopo do módulo, com TTL de 60 s", () => {
    expect(mocks.createSlugGuardSpy).toHaveBeenCalledTimes(1);
    expect(mocks.createSlugGuardSpy).toHaveBeenCalledWith(
      expect.objectContaining({ ttlMs: 60_000, load: expect.any(Function) }),
    );
  });

  it("CA-05: a função load do guard consulta getPublishedSlugs", async () => {
    const [{ load }] = mocks.createSlugGuardSpy.mock.calls[0] as [{ load: () => Promise<unknown> }];
    mocks.getPublishedSlugs.mockClear();
    await load();
    expect(mocks.getPublishedSlugs).toHaveBeenCalledTimes(1);
  });

  it("CA-01: um slug publicado só no banco (fora do demo) segue adiante", async () => {
    mocks.getPublishedSlugs.mockResolvedValue(["publicado-no-banco"]);
    const response = await run("/trabalhos/publicado-no-banco");
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("CA-01: um slug demo ausente da fonte de dados é reescrito para /404", async () => {
    mocks.getPublishedSlugs.mockResolvedValue(["publicado-no-banco"]);
    const response = await run(`/trabalhos/${DEMO_SLUGS[0]}`);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/404`);
  });

  it("CA-04: sem projetos publicados, qualquer /trabalhos/x é reescrito para /404", async () => {
    mocks.getPublishedSlugs.mockResolvedValue([]);
    for (const path of ["/trabalhos/x", `/trabalhos/${DEMO_SLUGS[0]}`, "/trabalhos/__vazio__"]) {
      const response = await run(path);
      expect(getRewrittenUrl(response), path).toBe(`${ORIGIN}/404`);
    }
  });

  it("CA-04: o slug reservado __vazio__ é tratado como inexistente", async () => {
    mocks.getPublishedSlugs.mockResolvedValue(["__vazio__", ...DEMO_SLUGS]);
    const response = await run("/trabalhos/__vazio__");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/404`);
  });

  it("CA-05: várias requisições dentro de 60 s consultam a fonte uma única vez", async () => {
    await run(`/trabalhos/${DEMO_SLUGS[0]}`);
    await run("/trabalhos/nao-existe");
    await Promise.all([run(`/trabalhos/${DEMO_SLUGS[1]}`), run(`/trabalhos/${DEMO_SLUGS[2]}`)]);
    expect(mocks.getPublishedSlugs).toHaveBeenCalledTimes(1);
  });

  it("CA-05: requisições concorrentes na primeira carga consultam a fonte uma única vez", async () => {
    await Promise.all(DEMO_SLUGS.map((slug) => run(`/trabalhos/${slug}`)));
    expect(mocks.getPublishedSlugs).toHaveBeenCalledTimes(1);
  });
});

describe('TASK-04b: proxy com lista indisponível ("unknown") — fail open', () => {
  beforeEach(() => {
    mocks.getPublishedSlugs.mockRejectedValue(new Error("banco inacessível"));
  });

  it('"unknown" → segue adiante (next), sem rewrite: a página decide com notFound()', async () => {
    const response = await run(`/trabalhos/${DEMO_SLUGS[0]}`);
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it('"unknown" → mesmo um slug inexistente segue adiante (sem 404 em massa)', async () => {
    const response = await run("/trabalhos/nao-existe");
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("a falha do banco não derruba o proxy (não lança)", async () => {
    await expect(run("/trabalhos/qualquer")).resolves.toBeDefined();
  });
});
