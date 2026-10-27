import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminFallback } from "./AdminFallback";

/** TASK-05: fallback de Suspense das telas do /admin (sessão/URL em streaming). */
describe("AdminFallback", () => {
  it('anuncia "Carregando…" como status (região viva educada)', () => {
    render(<AdminFallback />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando…");
  });

  it("não é um alerta nem mostra formulário", () => {
    render(<AdminFallback />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
