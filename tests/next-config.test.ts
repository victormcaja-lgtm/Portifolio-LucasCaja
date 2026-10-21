import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

interface NormalizedPattern {
  protocol?: string;
  hostname: string;
  pathname?: string;
}

function normalize(pattern: unknown): NormalizedPattern {
  if (pattern instanceof URL) {
    return {
      protocol: pattern.protocol.replace(/:$/, ""),
      hostname: pattern.hostname,
      pathname: pattern.pathname,
    };
  }
  const p = pattern as { protocol?: string; hostname: string; pathname?: string };
  return { protocol: p.protocol?.replace(/:$/, ""), hostname: p.hostname, pathname: p.pathname };
}

describe("next.config.ts — imagens remotas", () => {
  const patterns = (nextConfig.images?.remotePatterns ?? []).map(normalize);

  it("CA-12: permite https://picsum.photos/id/**", () => {
    const picsum = patterns.filter((p) => p.hostname === "picsum.photos");
    expect(picsum).toHaveLength(1);
    expect(picsum[0].protocol).toBe("https");
    expect(picsum[0].pathname).toBe("/id/**");
  });

  it("CA-12: permite o host de redirecionamento fastly.picsum.photos via https", () => {
    const fastly = patterns.filter((p) => p.hostname === "fastly.picsum.photos");
    expect(fastly).toHaveLength(1);
    expect(fastly[0].protocol).toBe("https");
  });

  it("CA-12: não permite nenhum outro host", () => {
    expect(patterns).toHaveLength(2);
    for (const p of patterns) {
      expect(["picsum.photos", "fastly.picsum.photos"]).toContain(p.hostname);
    }
    expect((nextConfig.images as { domains?: string[] } | undefined)?.domains ?? []).toEqual([]);
  });
});
