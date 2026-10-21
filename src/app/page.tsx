import { DemoNotice } from "@/components/site/DemoNotice";
import { EditorialGrid } from "@/components/site/EditorialGrid";
import { Hero } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipLink } from "@/components/site/SkipLink";
import { DEMO_HERO, DEMO_PROJECTS } from "@/content/demo";
import { collectImageCredits } from "@/lib/credits";

const CREDITS = collectImageCredits([DEMO_HERO, ...DEMO_PROJECTS.map((p) => p.cover)]);

export default function Home() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        <Hero image={DEMO_HERO} />
        <DemoNotice />
        <EditorialGrid projects={DEMO_PROJECTS} />
      </main>
      <SiteFooter credits={CREDITS} />
    </>
  );
}
