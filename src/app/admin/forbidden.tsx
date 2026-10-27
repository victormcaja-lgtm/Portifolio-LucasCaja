import Link from "next/link";
import { TEXT_LINK } from "@/components/admin/form-styles";

/** 403 da área administrativa: renderizado por forbidden() (requireRole, src/server/authz.ts). */
export default function AdminForbidden() {
  return (
    <section className="grid gap-12">
      <div>
        <p className="font-sans text-label text-ink-muted uppercase">Erro 403</p>
        <h1 className="mt-6 font-display text-headline font-light tracking-tight text-ink">
          Acesso negado
        </h1>
      </div>
      <p className="max-w-[60ch] font-sans text-lg leading-relaxed text-ink-muted">
        Seu papel não permite abrir esta página.
      </p>
      <div>
        <Link href="/admin" className={TEXT_LINK}>
          Voltar ao painel
        </Link>
      </div>
    </section>
  );
}
