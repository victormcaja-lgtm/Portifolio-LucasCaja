// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PROJECTS_TAG, projectTag } from "./cache-tags";

describe("TASK-04b: tags de cache (src/server/cache-tags.ts)", () => {
  it('PROJECTS_TAG é "projects"', () => {
    expect(PROJECTS_TAG).toBe("projects");
  });

  it('projectTag(slug) → "project:<slug>"', () => {
    expect(projectTag("estudo-i")).toBe("project:estudo-i");
    expect(projectTag("outro-slug")).toBe("project:outro-slug");
  });

  it("projectTag é diferente para slugs diferentes e nunca igual a PROJECTS_TAG", () => {
    expect(projectTag("a")).not.toBe(projectTag("b"));
    expect(projectTag("projects")).not.toBe(PROJECTS_TAG);
  });
});
