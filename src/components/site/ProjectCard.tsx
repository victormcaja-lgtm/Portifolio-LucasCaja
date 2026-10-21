import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { getCategoryName } from "@/lib/categories";
import { getSlotClassName, type EditorialSlot, type SlotAspect, type SlotSpan } from "@/lib/editorial-layout";
import { formatProjectIndex } from "@/lib/projects";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  position: number;
  slot: EditorialSlot;
}

const ASPECT_CLASS: Record<SlotAspect, string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[3/2]",
  square: "aspect-square",
};

/** Abaixo de md (coluna única), estreitos ocupam 4/5 da largura e seguem o alinhamento do slot. */
function mobileClassName(slot: EditorialSlot): string {
  if (slot.span !== "narrow") return "";
  const align = { start: "", center: "max-md:mx-auto", end: "max-md:ml-auto" }[slot.align];
  return ` max-md:w-4/5 ${align}`.trimEnd();
}

/** Largura aproximada ocupada pelo card a partir de md (12 colunas). */
const SIZES: Record<SlotSpan, string> = {
  wide: "(min-width: 1600px) 900px, (min-width: 768px) 58vw, 100vw",
  medium: "(min-width: 1600px) 640px, (min-width: 768px) 42vw, 100vw",
  narrow: "(min-width: 1600px) 520px, (min-width: 768px) 34vw, 80vw",
};

export function ProjectCard({ project, position, slot }: ProjectCardProps) {
  const index = formatProjectIndex(position);
  const categories = project.categories.map(getCategoryName);

  return (
    <article className={`${getSlotClassName(slot)}${mobileClassName(slot)}`}>
      <Reveal>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <span className="font-display text-lg font-light text-ink-muted italic">{index}</span>
          {project.isDemo ? (
            <span className="font-sans text-label text-signal uppercase">Demo</span>
          ) : null}
        </div>

        <div className={`relative overflow-hidden bg-rule ${ASPECT_CLASS[slot.aspect]}`}>
          <Image
            src={project.cover.src}
            alt={project.cover.alt}
            fill
            sizes={SIZES[slot.span]}
            className="card-image object-cover"
          />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <h3 className="font-display text-title leading-tight font-normal text-ink">
            {project.title}
          </h3>
          <p className="font-sans text-label text-ink-muted uppercase">
            {categories.join(" · ")}
          </p>
        </div>
      </Reveal>
    </article>
  );
}
