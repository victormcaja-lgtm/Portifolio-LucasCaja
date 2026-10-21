import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoNotice } from "@/components/site/DemoNotice";

describe("DemoNotice", () => {
  it('CA-04: renderiza role="note" com "Conteúdo de demonstração"', () => {
    render(<DemoNotice />);
    expect(screen.getByRole("note")).toHaveTextContent("Conteúdo de demonstração");
  });

  it("CA-04: explica que imagens e textos são provisórios", () => {
    render(<DemoNotice />);
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/imagens/i);
    expect(note).toHaveTextContent(/textos/i);
    expect(note).toHaveTextContent(/provis[óo]ri/i);
  });
});
