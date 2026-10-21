import { describe, expect, it } from "vitest";
import {
  filterProjectsByCategory,
  formatProjectIndex,
  getAdjacentProjects,
  getProjectBySlug,
  sortProjects,
} from "@/lib/projects";
import { makeProject } from "@/test/fixtures";

const a = makeProject({ id: "a", sortOrder: 30, categories: ["fine-art"] });
const b = makeProject({ id: "b", sortOrder: 10, categories: ["fashion-editorial", "high-fashion"] });
const c = makeProject({ id: "c", sortOrder: 20, categories: ["filme", "fine-art"] });
const d = makeProject({ id: "d", sortOrder: 5, categories: ["high-fashion"] });

const input = Object.freeze([a, b, c, d]);

describe("sortProjects", () => {
  it("ordena por sortOrder crescente", () => {
    expect(sortProjects(input).map((p) => p.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("retorna nova lista sem mutar a entrada", () => {
    const copy = [...input];
    const result = sortProjects(input);
    expect(input).toEqual(copy);
    expect(result).not.toBe(input);
  });

  it("retorna nova lista mesmo quando já está ordenada", () => {
    const sorted = [d, b, c, a];
    const result = sortProjects(sorted);
    expect(result).toEqual(sorted);
    expect(result).not.toBe(sorted);
  });

  it("aceita lista vazia", () => {
    expect(sortProjects([])).toEqual([]);
  });
});

describe("filterProjectsByCategory", () => {
  it('"todos" retorna todos os projetos ordenados', () => {
    expect(filterProjectsByCategory(input, "todos").map((p) => p.id)).toEqual(["d", "b", "c", "a"]);
  });

  it("slug retorna só os projetos que contêm a categoria, ordenados", () => {
    expect(filterProjectsByCategory(input, "fine-art").map((p) => p.id)).toEqual(["c", "a"]);
    expect(filterProjectsByCategory(input, "high-fashion").map((p) => p.id)).toEqual(["d", "b"]);
    expect(filterProjectsByCategory(input, "filme").map((p) => p.id)).toEqual(["c"]);
  });

  it("retorna lista vazia quando nenhum projeto tem a categoria", () => {
    expect(filterProjectsByCategory([a, c], "fashion-editorial")).toEqual([]);
  });

  it("não muta a entrada e retorna nova lista", () => {
    const copy = [...input];
    const result = filterProjectsByCategory(input, "todos");
    expect(input).toEqual(copy);
    expect(result).not.toBe(input);
  });
});

describe("formatProjectIndex", () => {
  it.each([
    [1, "01"],
    [9, "09"],
    [10, "10"],
    [42, "42"],
    [123, "123"],
  ])("%i → %s", (position, expected) => {
    expect(formatProjectIndex(position)).toBe(expected);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "lança RangeError para %s",
    (position) => {
      expect(() => formatProjectIndex(position)).toThrow(RangeError);
    },
  );
});

describe("getProjectBySlug (TASK-02)", () => {
  const list = Object.freeze([
    makeProject({ id: "s1", slug: "serie-um", sortOrder: 2 }),
    makeProject({ id: "s2", slug: "serie-dois", sortOrder: 1 }),
  ]);

  it("retorna o projeto com o slug informado", () => {
    expect(getProjectBySlug(list, "serie-dois")).toBe(list[1]);
    expect(getProjectBySlug(list, "serie-um")).toBe(list[0]);
  });

  it("retorna undefined para slug inexistente", () => {
    expect(getProjectBySlug(list, "nao-existe")).toBeUndefined();
  });

  it("retorna undefined para lista vazia", () => {
    expect(getProjectBySlug([], "serie-um")).toBeUndefined();
  });

  it("compara o slug exatamente (sem normalizar maiúsculas/espaços)", () => {
    expect(getProjectBySlug(list, "Serie-Um")).toBeUndefined();
    expect(getProjectBySlug(list, " serie-um")).toBeUndefined();
  });
});

describe("getAdjacentProjects (TASK-02)", () => {
  // Entrada fora de ordem: a vizinhança segue sortOrder, não a ordem do array.
  const p1 = makeProject({ id: "n1", slug: "um", sortOrder: 10 });
  const p2 = makeProject({ id: "n2", slug: "dois", sortOrder: 20 });
  const p3 = makeProject({ id: "n3", slug: "tres", sortOrder: 30 });
  const p4 = makeProject({ id: "n4", slug: "quatro", sortOrder: 40 });
  const shuffled = Object.freeze([p3, p1, p4, p2]);

  it("projeto do meio: anterior e próximo por sortOrder", () => {
    expect(getAdjacentProjects(shuffled, "dois")).toEqual({ previous: p1, next: p3 });
    expect(getAdjacentProjects(shuffled, "tres")).toEqual({ previous: p2, next: p4 });
  });

  it("circular: o anterior do primeiro é o último", () => {
    expect(getAdjacentProjects(shuffled, "um")).toEqual({ previous: p4, next: p2 });
  });

  it("circular: o próximo do último é o primeiro", () => {
    expect(getAdjacentProjects(shuffled, "quatro")).toEqual({ previous: p3, next: p1 });
  });

  it("com dois projetos, anterior e próximo são o outro projeto", () => {
    expect(getAdjacentProjects([p2, p1], "um")).toEqual({ previous: p2, next: p2 });
  });

  it("lista com 1 projeto → ambos null", () => {
    expect(getAdjacentProjects([p1], "um")).toEqual({ previous: null, next: null });
  });

  it("slug inexistente → lança Error", () => {
    expect(() => getAdjacentProjects(shuffled, "nao-existe")).toThrow(Error);
  });

  it("slug inexistente em lista vazia → lança Error", () => {
    expect(() => getAdjacentProjects([], "um")).toThrow(Error);
  });

  it("não muta a entrada", () => {
    const copy = [...shuffled];
    getAdjacentProjects(shuffled, "dois");
    expect(shuffled).toEqual(copy);
  });
});
