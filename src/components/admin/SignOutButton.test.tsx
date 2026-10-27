import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "./SignOutButton";

/**
 * TASK-05: `SignOutButton` (Client Component, sem props) chama `authClient.signOut()` e volta
 * para /admin/entrar (useRouter: replace ou push).
 */
const auth = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: auth.signInEmail },
    signOut: auth.signOut,
    resetPassword: auth.resetPassword,
  },
}));

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useRouter: () => router };
});

function navigations(): string[] {
  return [...router.replace.mock.calls, ...router.push.mock.calls].map(([url]) => String(url));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  for (const fn of Object.values(router)) fn.mockReset();
  auth.signOut.mockResolvedValue({ data: { success: true }, error: null });
});

describe("SignOutButton", () => {
  it('botão "Sair"', () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button", { name: "Sair" })).toBeEnabled();
  });

  it("CA-3: encerra a sessão e volta para /admin/entrar", async () => {
    render(<SignOutButton />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(navigations()).toContain("/admin/entrar"));
  });

  it("navega só depois que o signOut termina e fica desabilitado enquanto isso", async () => {
    const pending = deferred<unknown>();
    auth.signOut.mockReturnValue(pending.promise);
    render(<SignOutButton />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toBeDisabled();
    expect(navigations()).toEqual([]);
    await act(async () => {
      pending.resolve({ data: { success: true }, error: null });
    });
    await waitFor(() => expect(navigations()).toContain("/admin/entrar"));
  });
});
