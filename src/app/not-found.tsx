import type { Metadata } from "next";
import { NotFoundView } from "@/components/site/NotFoundView";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipLink } from "@/components/site/SkipLink";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader variant="solid" />
      <main id="conteudo">
        <NotFoundView />
      </main>
      <SiteFooter credits={[]} />
    </>
  );
}
