import { describe, expect, it } from "vitest";
import { roleLabel } from "./roles";

/** TASK-05: o papel aparece em português no painel (/admin). */
describe("roleLabel", () => {
  it.each([
    ["OWNER", "Proprietário"],
    ["ADMIN", "Administrador"],
    ["EDITOR", "Editor"],
  ] as const)("%s → %s", (role, label) => {
    expect(roleLabel(role)).toBe(label);
  });
});
