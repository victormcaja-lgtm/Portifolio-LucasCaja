import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFallback } from "@/components/admin/AdminFallback";
import { SetPasswordForm } from "@/components/admin/SetPasswordForm";

export const metadata: Metadata = {
  title: "Definir senha",
  // O token está na URL: não enviá-lo como Referer para outros endereços.
  referrer: "no-referrer",
};

export default function SetPasswordPage({ searchParams }: PageProps<"/admin/definir-senha">) {
  return (
    <section className="grid gap-12">
      <div>
        <p className="font-sans text-label text-ink-muted uppercase">Primeiro acesso</p>
        <h1 className="mt-6 font-display text-headline font-light tracking-tight text-ink">
          Definir senha
        </h1>
      </div>
      <Suspense fallback={<AdminFallback />}>
        <SetPasswordGate searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function SetPasswordGate({
  searchParams,
}: Pick<PageProps<"/admin/definir-senha">, "searchParams">) {
  const { token } = await searchParams;
  return <SetPasswordForm token={typeof token === "string" && token !== "" ? token : null} />;
}
