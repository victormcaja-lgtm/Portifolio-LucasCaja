import { NextRequest, type NextResponse } from "next/server";
import {
  getRedirectUrl,
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
/**
 * TASK-04c: destino do rewrite sem rota nem arquivo estático correspondente. Reescrever para
 * /404 fazia a Vercel servir o 404.html estático com HTTP 200 (soft 404).
 */
const NOT_FOUND_TARGET = `${ORIGIN}/_nao-encontrado`;

function expectNotFoundRewrite(response: NextResponse, label?: string) {
  expect(isRewrite(response), label).toBe(true);
  expect(getRewrittenUrl(response), label).toBe(NOT_FOUND_TARGET);
  expect(response.status, label).toBe(404);
}
const DEMO_SLUGS = DEMO_PROJECTS.map((p) => p.slug);

type ProxyModule = typeof import("./proxy");
let proxyModule: ProxyModule;
let errorSpy: MockInstance<typeof console.error>;

async function loadProxy(): Promise<ProxyModule> {
  vi.resetModules();
  return import("./proxy");
}

async function run(pathname: string, cookie?: string) {
  const init = cookie ? { headers: { cookie } } : undefined;
  return proxyModule.proxy(new NextRequest(`${ORIGIN}${pathname}`, init));
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
      expect(response.status).not.toBe(404);
    },
  );

  it("CA-12: slug conhecido com barra final também segue adiante", async () => {
    const response = await run("/trabalhos/estudo-i/");
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.status).not.toBe(404);
  });

  it("CA-12 / TASK-04c CA-1: slug desconhecido é reescrito para /_nao-encontrado com status 404", async () => {
    const response = await run("/trabalhos/nao-existe");
    expectNotFoundRewrite(response);
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it("CA-12 / TASK-04c CA-1: slug vazio (/trabalhos/) é reescrito para /_nao-encontrado com status 404", async () => {
    const response = await run("/trabalhos/");
    expectNotFoundRewrite(response);
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
    expect(response.status).not.toBe(404);
  });

  it("CA-01 / TASK-04c CA-1: um slug demo ausente da fonte de dados é reescrito para /_nao-encontrado com status 404", async () => {
    mocks.getPublishedSlugs.mockResolvedValue(["publicado-no-banco"]);
    const response = await run(`/trabalhos/${DEMO_SLUGS[0]}`);
    expectNotFoundRewrite(response);
  });

  it("CA-04 / TASK-04c CA-1: sem projetos publicados, qualquer /trabalhos/x é reescrito para /_nao-encontrado com status 404", async () => {
    mocks.getPublishedSlugs.mockResolvedValue([]);
    for (const path of ["/trabalhos/x", `/trabalhos/${DEMO_SLUGS[0]}`, "/trabalhos/__vazio__"]) {
      const response = await run(path);
      expectNotFoundRewrite(response, path);
    }
  });

  it("CA-04 / TASK-04c CA-1: o slug reservado __vazio__ é tratado como inexistente (status 404)", async () => {
    mocks.getPublishedSlugs.mockResolvedValue(["__vazio__", ...DEMO_SLUGS]);
    const response = await run("/trabalhos/__vazio__");
    expectNotFoundRewrite(response);
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
    expect(response.status).not.toBe(404);
  });

  it('"unknown" → mesmo um slug inexistente segue adiante (sem 404 em massa)', async () => {
    const response = await run("/trabalhos/nao-existe");
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.status).not.toBe(404);
  });

  it("a falha do banco não derruba o proxy (não lança)", async () => {
    await expect(run("/trabalhos/qualquer")).resolves.toBeDefined();
  });
});

/**
 * TASK-05: o proxy também protege /admin/* com uma checagem OTIMISTA: sem o cookie de sessão do
 * Better Auth (`getSessionCookie`), redireciona para /admin/entrar?next=<caminho>. A validação
 * real da sessão fica no servidor (`requireUser`). /admin/entrar e /admin/definir-senha ficam
 * de fora. O cookie usado aqui é o nome padrão do Better Auth (`better-auth.session_token`).
 */
const SESSION_COOKIE = "better-auth.session_token=token-assinado.abc";
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token=token-assinado.abc";

function expectLoginRedirect(response: NextResponse, next: string) {
  const location = getRedirectUrl(response);
  expect(location, `redirect esperado para o login (next=${next})`).not.toBeNull();
  expect([307, 308, 302, 303]).toContain(response.status);
  const url = new URL(location as string);
  expect(url.origin).toBe(ORIGIN);
  expect(url.pathname).toBe("/admin/entrar");
  expect(url.searchParams.get("next")).toBe(next);
}

function expectPassThrough(response: NextResponse) {
  expect(getRedirectUrl(response)).toBeNull();
  expect(isRewrite(response)).toBe(false);
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

describe("TASK-05: proxy em /admin (checagem otimista do cookie de sessão)", () => {
  it("CA-3: /admin sem cookie → redirect para /admin/entrar?next=/admin", async () => {
    expectLoginRedirect(await run("/admin"), "/admin");
  });

  it("CA-3: subcaminho sem cookie → next preserva o caminho", async () => {
    expectLoginRedirect(await run("/admin/projetos/novo"), "/admin/projetos/novo");
  });

  it("um cookie qualquer (não de sessão) não basta", async () => {
    expectLoginRedirect(await run("/admin", "outro=1; tema=escuro"), "/admin");
  });

  it("/admin com o cookie de sessão segue adiante (validação real no servidor)", async () => {
    expectPassThrough(await run("/admin", SESSION_COOKIE));
  });

  it("subcaminho com o cookie de sessão segue adiante", async () => {
    expectPassThrough(await run("/admin/projetos", `tema=escuro; ${SESSION_COOKIE}`));
  });

  it("aceita o cookie com prefixo __Secure- (produção em https)", async () => {
    expectPassThrough(await run("/admin", SECURE_SESSION_COOKIE));
  });

  it.each(["/admin/entrar", "/admin/entrar/", "/admin/definir-senha", "/admin/definir-senha?token=abc"])(
    "exceção: %s sem cookie segue adiante (sem redirect)",
    async (path) => {
      expectPassThrough(await run(path));
    },
  );

  it("exceção: /admin/entrar com cookie também segue adiante (a página decide)", async () => {
    expectPassThrough(await run("/admin/entrar", SESSION_COOKIE));
  });

  it("/admin não consulta a lista de slugs publicados", async () => {
    await run("/admin");
    await run("/admin/projetos", SESSION_COOKIE);
    expect(mocks.getPublishedSlugs).not.toHaveBeenCalled();
  });

  it("o matcher inclui /admin/:path* e mantém /trabalhos/:slug", () => {
    const { config } = proxyModule;
    for (const url of [
      "/admin",
      "/admin/projetos",
      "/admin/projetos/novo",
      "/admin/entrar",
      "/admin/definir-senha",
      "/trabalhos/estudo-i",
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
    }
    for (const url of ["/", "/sobre", "/administrar", "/api/auth/get-session"]) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(false);
    }
  });

  it("/trabalhos/:slug continua igual com cookie de sessão presente", async () => {
    const known = await run(`/trabalhos/${DEMO_SLUGS[0]}`, SESSION_COOKIE);
    expect(isRewrite(known)).toBe(false);
    expect(getRedirectUrl(known)).toBeNull();
    expectNotFoundRewrite(await run("/trabalhos/nao-existe", SESSION_COOKIE));
  });
});
