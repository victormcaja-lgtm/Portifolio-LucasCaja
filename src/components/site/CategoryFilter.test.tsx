import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryFilter } from "@/components/site/CategoryFilter";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryFilterValue } from "@/lib/types";

function setup(value: CategoryFilterValue = "todos") {
  const onChange = vi.fn();
  render(<CategoryFilter categories={CATEGORIES} value={value} onChange={onChange} />);
  const group = screen.getByRole("group", { name: "Filtrar por categoria" });
  return { onChange, group };
}

describe("CategoryFilter", () => {
  it('CA-05: renderiza o grupo "Filtrar por categoria"', () => {
    const { group } = setup();
    expect(group).toBeInTheDocument();
  });

  it("CA-05: botão Todos seguido de um botão por categoria, na ordem de CATEGORIES", () => {
    const { group } = setup();
    const names = within(group)
      .getAllByRole("button")
      .map((b) => b.textContent?.trim());
    expect(names).toEqual(["Todos", ...CATEGORIES.map((c) => c.name)]);
  });

  it('CA-05: "Todos" pressionado quando value="todos"', () => {
    const { group } = setup("todos");
    expect(within(group).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    for (const c of CATEGORIES) {
      expect(within(group).getByRole("button", { name: c.name })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("CA-05: só o botão do valor atual tem aria-pressed=true", () => {
    const { group } = setup("high-fashion");
    for (const button of within(group).getAllByRole("button")) {
      const expected = button.textContent?.trim() === "High Fashion" ? "true" : "false";
      expect(button).toHaveAttribute("aria-pressed", expected);
    }
  });

  it("CA-05: clicar chama onChange com o valor correspondente", async () => {
    const user = userEvent.setup();
    const { group, onChange } = setup("fine-art");

    for (const c of CATEGORIES) {
      await user.click(within(group).getByRole("button", { name: c.name }));
      expect(onChange).toHaveBeenLastCalledWith(c.slug);
    }
    await user.click(within(group).getByRole("button", { name: "Todos" }));
    expect(onChange).toHaveBeenLastCalledWith("todos");
  });

  it("CA-05: botões são do tipo button (não submetem formulários)", () => {
    const { group } = setup();
    for (const button of within(group).getAllByRole("button")) {
      expect(button.tagName).toBe("BUTTON");
      expect(button).toHaveAttribute("type", "button");
    }
  });
});
