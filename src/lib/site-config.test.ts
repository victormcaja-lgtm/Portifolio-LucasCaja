import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site-config";

describe("SITE (contrato de módulo)", () => {
  it("tem o nome do fotógrafo", () => {
    expect(SITE.name).toBe("Lucas Caja");
  });

  it("lista as disciplinas na ordem definida pela spec", () => {
    expect([...SITE.disciplines]).toEqual([
      "Fine Art",
      "Fashion Editorial",
      "High Fashion",
      "Fotografia & Filme",
    ]);
  });

  it("tem descrição não vazia e neutra (sem fatos biográficos inventados)", () => {
    expect(typeof SITE.description).toBe("string");
    expect(SITE.description.trim().length).toBeGreaterThan(0);
    expect(SITE.description).not.toMatch(
      /pr[eê]mi|premiad|clientes?\b|anos de|desde \d|nascid|formad|\b(19|20)\d{2}\b/i,
    );
  });
});
