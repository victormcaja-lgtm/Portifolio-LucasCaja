import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyWorks } from "@/components/site/EmptyWorks";

const EMPTY = "Nenhum trabalho publicado no momento.";

describe("TASK-04b: EmptyWorks — estado vazio da seção de trabalhos (CA-04)", () => {
  it('CA-04: é uma seção com id "trabalhos" (alvo do link do menu), nomeada pelo título', () => {
    render(<EmptyWorks />);
    const section = screen.getByRole("region", { name: "Trabalhos" });
    expect(section).toHaveAttribute("id", "trabalhos");
  });

  it("CA-04: mostra o título Trabalhos como h2 (o h1 da página fica no hero)", () => {
    render(<EmptyWorks />);
    expect(screen.getByRole("heading", { level: 2, name: "Trabalhos" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("CA-04: mostra a mensagem de estado vazio", () => {
    render(<EmptyWorks />);
    const section = screen.getByRole("region", { name: "Trabalhos" });
    expect(within(section).getByText(EMPTY)).toBeInTheDocument();
  });

  it("CA-04: sem filtro, contador, lista, links ou imagens", () => {
    const { container } = render(<EmptyWorks />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryAllByRole("list")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(screen.queryByText(/\b\d+\s+projetos?\b/i)).toBeNull();
  });

  it("CA-04: a mensagem usa tipografia sans e text-ink-muted (design system)", () => {
    render(<EmptyWorks />);
    const message = screen.getByText(EMPTY);
    expect(message.closest(".font-sans")).not.toBeNull();
    expect(message.closest(".text-ink-muted")).not.toBeNull();
  });
});
