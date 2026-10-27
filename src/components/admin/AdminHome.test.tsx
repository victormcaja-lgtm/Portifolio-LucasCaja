import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminHome } from "./AdminHome";

/**
 * TASK-05, tela /admin (placeholder do painel). `AdminHome` recebe `{ name, role }` (dados de
 * `requireUser()` na página) e renderiza a saudação, o papel em português, o texto honesto e
 * o botão "Sair" (`SignOutButton`).
 */
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: vi.fn() }, signOut: vi.fn(), resetPassword: vi.fn() },
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() };
  return { ...actual, useRouter: () => router };
});

describe("AdminHome", () => {
  it('CA-3 / ciclo 2, item 4: saudação "Olá, {nome}" como parágrafo de destaque, não como título', () => {
    render(<AdminHome name="Ana Teste" role="OWNER" />);
    const greeting = screen.getByText("Olá, Ana Teste");
    expect(greeting.tagName).toBe("P");
    expect(screen.queryByRole("heading", { name: /Olá/ })).not.toBeInTheDocument();
  });

  it('ciclo 2, item 4: não tem h1 (o h1 estático "Painel" fica na página, fora do Suspense)', () => {
    render(<AdminHome name="Ana Teste" role="OWNER" />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it.each([
    ["OWNER", "Proprietário"],
    ["ADMIN", "Administrador"],
    ["EDITOR", "Editor"],
  ] as const)("CA-3: papel %s aparece como %s", (role, label) => {
    render(<AdminHome name="Ana" role={role} />);
    expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(role);
  });

  it("texto honesto: o painel de projetos ainda não existe", () => {
    render(<AdminHome name="Ana" role="ADMIN" />);
    expect(
      screen.getByText("O painel de projetos chega na próxima etapa."),
    ).toBeInTheDocument();
  });

  it('tem o botão "Sair"', () => {
    render(<AdminHome name="Ana" role="EDITOR" />);
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });

  it("não apresenta funcionalidades como implementadas (sem links para projetos)", () => {
    render(<AdminHome name="Ana" role="OWNER" />);
    expect(screen.queryByRole("link", { name: /projetos/i })).not.toBeInTheDocument();
  });
});
