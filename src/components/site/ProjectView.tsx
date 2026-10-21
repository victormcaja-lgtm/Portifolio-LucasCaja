import Image from "next/image";
import { ProjectNav } from "@/components/site/ProjectNav";
import { Reveal } from "@/components/ui/Reveal";
import { getCategoryName } from "@/lib/categories";
import { formatProjectIndex } from "@/lib/projects";
import type { ImageAsset, Project } from "@/lib/types";

interface ProjectViewProps {
  project: Project;
  previous: Project | null;
  next: Project | null;
}

type Orientation = "landscape" | "portrait" | "square";

function getOrientation({ width, height }: ImageAsset): Orientation {
  const ratio = width / height;
  if (ratio > 1.1) return "landscape";
  if (ratio < 0.9) return "portrait";
  return "square";
}

/**
 * Altura útil da tela: viewport menos o cabeçalho fixo (h-20 a partir de md). A capa nunca
 * passa disso, para caber inteira abaixo do cabeçalho.
 */
const VIEWPORT_BELOW_HEADER = "(100svh - 5rem)";

/**
 * Capa: horizontal quase full-bleed (sem margem no mobile, só a margem lateral da página a
 * partir de md), com altura limitada à área útil — o excedente é recortado ao centro
 * (object-cover). Vertical e quadrada mais estreitas e deslocadas à direita, mantendo a
 * composição assimétrica com o título à esquerda; a largura delas é limitada pela proporção
 * da imagem (ver coverStyle), para a altura também caber na área útil, sem recorte.
 */
const COVER_LAYOUT: Record<
  Orientation,
  { className: string; imageClassName: string; sizes: string }
> = {
  landscape: {
    className: "w-full",
    imageClassName: "max-h-[calc(100svh-5rem)] object-cover",
    sizes:
      "(min-width: 1600px) 1520px, (min-width: 1024px) calc(100vw - 80px), (min-width: 768px) calc(100vw - 48px), 100vw",
  },
  square: {
    className: "w-full md:ml-auto md:w-9/12 lg:w-8/12",
    imageClassName: "",
    sizes: "(min-width: 1600px) 1015px, (min-width: 1024px) 64vw, (min-width: 768px) 72vw, 100vw",
  },
  portrait: {
    className: "w-full md:ml-auto md:w-8/12 lg:w-7/12",
    imageClassName: "",
    sizes: "(min-width: 1600px) 890px, (min-width: 1024px) 56vw, (min-width: 768px) 64vw, 100vw",
  },
};

/**
 * Ritmo da galeria (cíclico, 4 tempos) na grade de 12 colunas a partir de md:
 * larga à esquerda + estreita à direita deslocada para baixo; depois o par invertido.
 * No mobile, coluna única: as estreitas ocupam 4/5 da largura, alternando o lado.
 */
const GALLERY_PATTERN: readonly { className: string; sizes: string }[] = [
  {
    className: "md:col-span-7 md:col-start-1",
    sizes: "(min-width: 1600px) 890px, (min-width: 768px) 58vw, 100vw",
  },
  {
    className:
      "w-4/5 justify-self-end md:w-auto md:col-span-5 md:col-start-8 md:justify-self-stretch md:mt-40 lg:col-span-4 lg:col-start-9 lg:mt-64",
    sizes: "(min-width: 1600px) 505px, (min-width: 1024px) 32vw, (min-width: 768px) 40vw, 80vw",
  },
  {
    className:
      "w-4/5 md:w-auto md:col-span-5 md:col-start-1 md:mt-40 lg:col-span-4 lg:col-start-2 lg:mt-64",
    sizes: "(min-width: 1600px) 505px, (min-width: 1024px) 32vw, (min-width: 768px) 40vw, 80vw",
  },
  {
    className: "md:col-span-7 md:col-start-6",
    sizes: "(min-width: 1600px) 890px, (min-width: 768px) 58vw, 100vw",
  },
];

export function ProjectView({ project, previous, next }: ProjectViewProps) {
  const categories = project.categories.map(getCategoryName);
  const orientation = getOrientation(project.cover);
  const cover = COVER_LAYOUT[orientation];
  const coverAspect = project.cover.width / project.cover.height;
  const coverStyle =
    orientation === "landscape"
      ? undefined
      : { maxWidth: `calc(${VIEWPORT_BELOW_HEADER} * ${coverAspect})` };
  const total = formatProjectIndex(project.gallery.length + 1);

  return (
    <>
      <article>
        <div className="mx-auto max-w-page px-4 pt-28 md:px-6 md:pt-36 lg:px-10 lg:pt-40">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-4">
            <p className="font-sans text-label text-ink-muted uppercase">
              <span className="sr-only">Categorias: </span>
              {categories.join(" · ")}
            </p>
            {project.isDemo ? (
              <span className="font-sans text-label text-signal uppercase">Demo</span>
            ) : null}
          </div>

          {/* A partir de xl, o resumo fica ao lado do título, alinhado à base: a capa sobe para a primeira dobra. */}
          <div className="xl:grid xl:grid-cols-12 xl:items-end xl:gap-x-8">
            <h1 className="mt-12 max-w-[14ch] font-display text-display font-light tracking-tight break-words text-ink md:mt-16 lg:mt-14 xl:col-span-8">
              {project.title}
            </h1>

            {project.summary || project.isDemo ? (
              <div className="mt-10 grid grid-cols-1 gap-y-8 md:mt-14 md:grid-cols-12 md:gap-x-6 lg:mt-12 lg:gap-x-8 xl:col-span-4 xl:col-start-9 xl:mt-0 xl:grid-cols-1 xl:gap-y-6">
                {project.summary ? (
                  <p className="max-w-[40ch] font-sans text-lg leading-relaxed text-ink md:col-span-6 md:col-start-7 lg:col-span-4 lg:col-start-8 xl:col-span-1 xl:col-start-1">
                    {project.summary}
                  </p>
                ) : null}
                {project.isDemo ? (
                  <p
                    role="note"
                    className="flex max-w-[40ch] flex-col gap-1 border-l border-signal/40 pl-4 font-sans text-sm leading-relaxed text-signal md:col-span-6 md:col-start-7 lg:col-span-4 lg:col-start-8 xl:col-span-1 xl:col-start-1"
                  >
                    <strong className="text-label font-medium uppercase">Conteúdo de demonstração</strong>
                    <span>Textos e imagens provisórios, a substituir pelo acervo definitivo.</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-page md:mt-16 md:px-6 lg:px-10">
          <div className={cover.className} style={coverStyle}>
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              width={project.cover.width}
              height={project.cover.height}
              sizes={cover.sizes}
              loading="eager"
              fetchPriority="high"
              className={`h-auto w-full bg-rule ${cover.imageClassName}`}
            />
            <span
              aria-hidden="true"
              className="mt-3 block px-4 font-display text-lg font-light text-ink-muted italic md:px-0"
            >
              01 / {total}
            </span>
          </div>
        </div>

        {project.gallery.length > 0 ? (
          <ul
            role="list"
            aria-label="Galeria"
            className="mx-auto mt-section grid max-w-page grid-cols-1 gap-y-16 px-4 md:grid-cols-12 md:gap-x-6 md:gap-y-32 md:px-6 lg:gap-x-8 lg:gap-y-48 lg:px-10"
          >
            {project.gallery.map((image, i) => {
              const slot = GALLERY_PATTERN[i % GALLERY_PATTERN.length];
              return (
                <li key={`${image.src}-${i}`} className={`md:self-start ${slot.className}`}>
                  <Reveal>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes={slot.sizes}
                      className="h-auto w-full bg-rule"
                    />
                    <span
                      aria-hidden="true"
                      className="mt-3 block font-display text-lg font-light text-ink-muted italic"
                    >
                      {formatProjectIndex(i + 2)} / {total}
                    </span>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        ) : null}
      </article>

      <div className="mt-section">
        <ProjectNav previous={previous} next={next} />
      </div>
    </>
  );
}
