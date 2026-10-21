import { describe, expect, it } from "vitest";
import { buildProjectMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site-config";
import { makeProject } from "@/test/fixtures";

describe("buildProjectMetadata (CA-07)", () => {
  it("CA-07: title = `${project.title} — ${SITE.name}`", () => {
    const project = makeProject({ title: "Série Demonstração Um", summary: "Resumo." });
    expect(buildProjectMetadata(project).title).toBe(`Série Demonstração Um — ${SITE.name}`);
  });

  it("CA-07: description = project.summary quando existe", () => {
    const project = makeProject({ summary: "Texto de demonstração. Ensaio em luz natural." });
    expect(buildProjectMetadata(project).description).toBe(
      "Texto de demonstração. Ensaio em luz natural.",
    );
  });

  it("CA-07: description = SITE.description quando não há summary", () => {
    const project = makeProject({ summary: undefined });
    expect(buildProjectMetadata(project).description).toBe(SITE.description);
  });

  it("CA-07: retorna exatamente { title, description }", () => {
    const project = makeProject({ title: "X", summary: "Y" });
    expect(buildProjectMetadata(project)).toEqual({ title: `X — ${SITE.name}`, description: "Y" });
  });
});
