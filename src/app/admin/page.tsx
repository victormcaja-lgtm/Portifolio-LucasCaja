import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFallback } from "@/components/admin/AdminFallback";
import { AdminHome } from "@/components/admin/AdminHome";
import { requireUser } from "@/server/authz";

export const metadata: Metadata = { title: "Painel" };

/**
 * Placeholder do painel. O rótulo e o `h1` são estáticos e ficam fora do <Suspense>: a página
 * nunca fica sem título durante o streaming. A sessão é lida dentro do <Suspense>: com Cache
 * Components, leituras da requisição (headers) ficam fora do shell estático (docs:
 * 02-guides/authentication-with-cache-components.md, "Step 2").
 */
export default function AdminPage() {
  return (
    <div className="grid gap-12">
      <div>
        <p className="font-sans text-label text-ink-muted uppercase">Painel</p>
        <h1 className="mt-6 font-display text-headline font-light tracking-tight text-ink">
          Painel
        </h1>
      </div>
      <Suspense fallback={<AdminFallback />}>
        <Panel />
      </Suspense>
    </div>
  );
}

async function Panel() {
  const user = await requireUser("/admin");
  return <AdminHome name={user.name} role={user.role} />;
}
