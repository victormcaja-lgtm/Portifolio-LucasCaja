import { DemoNotice } from "@/components/site/DemoNotice";
import { EditorialGrid } from "@/components/site/EditorialGrid";
import { EmptyWorks } from "@/components/site/EmptyWorks";
import { Hero } from "@/components/site/Hero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SkipLink } from "@/components/site/SkipLink";
import { collectImageCredits } from "@/lib/credits";
import { getHeroImage, getPublishedProjects } from "@/server/content";
import { getContentSource } from "@/server/content-source";

export default async function Home() {
  const projects = await getPublishedProjects();
  const hero = getHeroImage();
  const credits = collectImageCredits([hero, ...projects.map((project) => project.cover)]);
  // O aviso aparece se a fonte for o demo, se a imagem de abertura for de demonstração
  // ou se algum projeto exibido for de demonstração (seed).
  const showDemoNotice =
    getContentSource() === "demo" || hero.isDemo === true || projects.some((project) => project.isDemo);

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        <Hero image={hero} />
        {showDemoNotice && <DemoNotice />}
        {projects.length > 0 ? <EditorialGrid projects={projects} /> : <EmptyWorks />}
      </main>
      <SiteFooter credits={credits} />
    </>
  );
}
