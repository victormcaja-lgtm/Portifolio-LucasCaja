"use client";

import { useId, useState } from "react";
import { CategoryFilter } from "@/components/site/CategoryFilter";
import { ProjectCard } from "@/components/site/ProjectCard";
import { CATEGORIES } from "@/lib/categories";
import { getEditorialSlot } from "@/lib/editorial-layout";
import { filterProjectsByCategory } from "@/lib/projects";
import type { CategoryFilterValue, Project } from "@/lib/types";

interface EditorialGridProps {
  projects: readonly Project[];
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "projeto" : "projetos"}`;
}

export function EditorialGrid({ projects }: EditorialGridProps) {
  const headingId = useId();
  const [filter, setFilter] = useState<CategoryFilterValue>("todos");
  const visible = filterProjectsByCategory(projects, filter);

  return (
    <section
      id="trabalhos"
      aria-labelledby={headingId}
      className="mx-auto max-w-page scroll-mt-16 px-4 py-section md:px-6 lg:px-10"
    >
      <div className="flex flex-col gap-8 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between md:gap-12 md:pb-10">
        <div className="flex items-baseline gap-5">
          <h2 id={headingId} className="font-display text-headline leading-none font-light text-ink">
            Trabalhos
          </h2>
          <p aria-live="polite" className="font-sans text-label text-ink-muted uppercase">
            {countLabel(visible.length)}
          </p>
        </div>
        <CategoryFilter categories={CATEGORIES} value={filter} onChange={setFilter} />
      </div>

      <ul
        role="list"
        className="mt-16 grid grid-cols-1 gap-y-20 md:mt-24 md:grid-cols-12 md:gap-x-6 md:gap-y-28 lg:gap-x-8 lg:gap-y-36"
      >
        {visible.map((project, i) => (
          <li key={project.id} role="listitem" className="contents">
            <ProjectCard project={project} position={i + 1} slot={getEditorialSlot(i)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
