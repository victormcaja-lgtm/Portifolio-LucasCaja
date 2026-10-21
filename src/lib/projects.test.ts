import { describe, expect, it } from "vitest";
import { filterProjectsByCategory, formatProjectIndex, sortProjects } from "@/lib/projects";
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
