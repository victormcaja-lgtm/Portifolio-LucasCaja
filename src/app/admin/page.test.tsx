import { render, screen } from "@testing-library/react";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage, { metadata } from "@/app/admin/page";

/**
 * TASK-05, ciclo de correção 2, item 4: em /admin, o rótulo "Painel" e o h1 estático "Painel"
 * ficam FORA do <Suspense>; a saudação "Olá, {nome}" fica dentro (parágrafo de destaque).
 * Assim, durante o streaming (sessão ainda não lida), a página já tem o h1.
 *
 * `requireUser` é mockado: uma promessa pendente simula o streaming (fallback visível).
 */
const authz = vi.hoisted(() => ({ requireUser: vi.fn() }));

vi.mock("@/server/authz", () => authz);

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: vi.fn() }, signOut: vi.fn(), resetPassword: vi.fn() },
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() };
  return { ...actual, useRouter: () => router };
});

const Page = AdminPage as unknown as () => ReactElement;

type AnyProps = { children?: ReactNode } & Record<string, unknown>;

/**
 * Resolve no teste os Server Components `async` da árvore (o React do cliente não renderiza
 * componentes async no jsdom): cada elemento cujo tipo é uma função `async` é substituído pelo
 * resultado aguardado. Os demais elementos (Suspense, Client Components) ficam como estão.
 */
async function resolveAsync(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveAsync));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<AnyProps>;
  const { type } = element;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    const rendered = await (type as (props: AnyProps) => Promise<ReactNode>)(element.props);
    return resolveAsync(rendered);
  }
  if (element.props?.children === undefined) return element;
  const children = await resolveAsync(element.props.children);
  return cloneElement(element, undefined, children);
}

beforeEach(() => {
  authz.requireUser.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/admin (página)", () => {
  it('metadata.title é "Painel"', () => {
    expect(metadata.title).toBe("Painel");
  });

  it('ciclo 2, item 4: durante o streaming, já há o h1 estático "Painel" (fora do Suspense)', async () => {
    authz.requireUser.mockReturnValue(new Promise(() => {}));
    render(Page());
    expect(await screen.findByRole("status")).toHaveTextContent("Carregando…");
    expect(screen.getByRole("heading", { level: 1, name: "Painel" })).toBeInTheDocument();
    expect(screen.queryByText(/Olá,/)).not.toBeInTheDocument();
  });

  it('ciclo 2, item 4: com a sessão lida, um único h1 "Painel" e a saudação "Olá, {nome}" no conteúdo', async () => {
    authz.requireUser.mockResolvedValue({
      id: "u1",
      name: "Ana Teste",
      email: "ana@exemplo.test",
      role: "OWNER",
    });
    render(await resolveAsync(Page()));
    expect(await screen.findByText("Olá, Ana Teste")).toBeInTheDocument();
    expect(authz.requireUser).toHaveBeenCalledWith("/admin");
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveAccessibleName("Painel");
    expect(screen.queryByRole("heading", { name: /Olá/ })).not.toBeInTheDocument();
  });
});
