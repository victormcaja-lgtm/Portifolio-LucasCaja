import { describe, expect, it } from "vitest";
import { authClient } from "./auth-client";

/**
 * TASK-05: `src/lib/auth-client.ts` exporta `authClient = createAuthClient()` (better-auth/react).
 * As telas usam `signIn.email`, `resetPassword` e `signOut`.
 */
describe("authClient", () => {
  it("expõe signIn.email, resetPassword e signOut", () => {
    expect(typeof authClient.signIn.email).toBe("function");
    expect(typeof authClient.resetPassword).toBe("function");
    expect(typeof authClient.signOut).toBe("function");
  });
});
