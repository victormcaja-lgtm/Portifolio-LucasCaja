"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ERROR_MESSAGE } from "./form-styles";

const BUTTON =
  "-ml-3 inline-flex min-h-11 items-center px-3 font-sans text-label text-ink uppercase underline underline-offset-8 transition-colors duration-ui ease-editorial hover:text-ink-muted disabled:cursor-not-allowed disabled:text-ink-muted";

/** Encerra a sessão e volta para /admin/entrar (só depois que o servidor confirmar). */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function handleClick() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (!result?.error) {
        router.replace("/admin/entrar");
        return;
      }
    } catch {
      // Falha de rede: a sessão continua; o usuário pode tentar de novo.
    }
    setError("Não foi possível sair. Tente novamente.");
    inFlight.current = false;
    setPending(false);
  }

  return (
    <div className="grid gap-4">
      <div>
        <button type="button" onClick={handleClick} disabled={pending} className={BUTTON}>
          {pending ? "Saindo…" : "Sair"}
        </button>
      </div>
      <p role="alert" className={ERROR_MESSAGE}>
        {error}
      </p>
    </div>
  );
}
