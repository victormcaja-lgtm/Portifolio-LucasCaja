import { DemoNotice } from "@/components/site/DemoNotice";
import { EditorialGrid } from "@/components/site/EditorialGrid";
import { Hero } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";
import { collectImageCredits } from "@/lib/credits";

const CREDITS = collectImageCredits([DEMO_HERO, ...DEMO_PROJECTS.map((p) => p.cover)]);

export default function Home() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-60 bg-ink px-4 py-3 font-sans text-label text-paper uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:min-h-11 focus:items-center"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo">
        <Hero image={DEMO_HERO} />
        <DemoNotice />
        <EditorialGrid projects={DEMO_PROJECTS} />
      </main>
      <SiteFooter credits={CREDITS} />
    </>
  );
}
