import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site-config";
import { AdminShell } from "./AdminShell";

/**
 * TASK-05: layout mínimo do admin (`AdminShell`, props `{ children }`), usado pelo
 * src/app/admin/layout.tsx. Mostra o nome do site e o link "Ver site"; não usa o
 * SiteHeader/SiteFooter públicos.
 */
describe("AdminShell", () => {
  it("mostra o nome do site", () => {
    render(
      <AdminShell>
        <p>conteúdo</p>
      </AdminShell>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent(SITE.name);
  });

  it('tem o link "Ver site" para a página inicial', () => {
    render(
      <AdminShell>
        <p>conteúdo</p>
      </AdminShell>,
    );
    expect(screen.getByRole("link", { name: "Ver site" })).toHaveAttribute("href", "/");
  });

  it("renderiza o conteúdo dentro de <main>", () => {
    render(
      <AdminShell>
        <p>conteúdo da tela</p>
      </AdminShell>,
    );
    expect(within(screen.getByRole("main")).getByText("conteúdo da tela")).toBeInTheDocument();
  });

  it("não inclui a navegação pública (Trabalhos/Contato) nem o rodapé público", () => {
    render(
      <AdminShell>
        <p>conteúdo</p>
      </AdminShell>,
    );
    expect(screen.queryByRole("link", { name: "Trabalhos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Contato" })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
