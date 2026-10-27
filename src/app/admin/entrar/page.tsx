import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminFallback } from "@/components/admin/AdminFallback";
import { SignInForm } from "@/components/admin/SignInForm";
import { getCurrentUser } from "@/server/authz";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage({ searchParams }: PageProps<"/admin/entrar">) {
  return (
    <section className="grid gap-12">
      <div>
        <p className="font-sans text-label text-ink-muted uppercase">Área restrita</p>
        <h1 className="mt-6 font-display text-headline font-light tracking-tight text-ink">
          Entrar
        </h1>
      </div>
      <Suspense fallback={<AdminFallback />}>
        <SignInGate searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** Já logado → /admin. Caso contrário, o formulário com o `next` da URL. */
async function SignInGate({ searchParams }: Pick<PageProps<"/admin/entrar">, "searchParams">) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (user) redirect("/admin");
  const next = typeof params.next === "string" ? params.next : null;
  return <SignInForm next={next} />;
}
