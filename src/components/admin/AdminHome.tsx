import { roleLabel, type Role } from "@/lib/roles";
import { SignOutButton } from "./SignOutButton";

interface AdminHomeProps {
  name: string;
  role: Role;
}

/**
 * Conteúdo do painel (/admin) que depende da sessão: saudação, papel e saída. Não tem `h1`: o
 * título estático "Painel" fica na página, fora do <Suspense>, para existir já no streaming.
 */
export function AdminHome({ name, role }: AdminHomeProps) {
  return (
    <section className="grid gap-12">
      <p className="font-display text-title font-light text-ink">Olá, {name}</p>
      <dl className="grid gap-2 border-t border-rule pt-6">
        <dt className="font-sans text-label text-ink-muted uppercase">Papel</dt>
        <dd className="font-sans text-lg text-ink">{roleLabel(role)}</dd>
      </dl>
      <p className="max-w-[60ch] font-sans text-lg leading-relaxed text-ink-muted">
        O painel de projetos chega na próxima etapa.
      </p>
      <SignOutButton />
    </section>
  );
}
