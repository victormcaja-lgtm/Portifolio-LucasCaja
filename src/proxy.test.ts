import { NextRequest } from "next/server";
import {
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { DEMO_PROJECTS } from "@/content/demo";
import { config, proxy } from "./proxy";

const ORIGIN = "https://exemplo.test";

function run(pathname: string) {
  return proxy(new NextRequest(`${ORIGIN}${pathname}`));
}

describe("CA-12: proxy de 404 (src/proxy.ts)", () => {
  it.each(DEMO_PROJECTS.map((p) => p.slug))(
    "CA-12: slug conhecido /trabalhos/%s segue adiante (next), sem rewrite",
    (slug) => {
      const response = run(`/trabalhos/${slug}`);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(isRewrite(response)).toBe(false);
      expect(getRewrittenUrl(response)).toBeNull();
    },
  );

  it("CA-12: slug conhecido com barra final também segue adiante", () => {
    const response = run("/trabalhos/estudo-i/");
    expect(isRewrite(response)).toBe(false);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("CA-12: slug desconhecido é reescrito para /404", () => {
    const response = run("/trabalhos/nao-existe");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/404`);
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it("CA-12: slug vazio (/trabalhos/) é reescrito para /404", () => {
    const response = run("/trabalhos/");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/404`);
  });

  it("CA-12: o matcher cobre /trabalhos/<slug> e não outras rotas", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/trabalhos/nao-existe" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/trabalhos/estudo-i" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "/" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/sobre" })).toBe(false);
  });
});
