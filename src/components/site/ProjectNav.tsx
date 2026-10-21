import Link from "next/link";
import type { Project } from "@/lib/types";

interface ProjectNavProps {
  previous: Project | null;
  next: Project | null;
}

interface AdjacentLinkProps {
  project: Project;
  direction: "previous" | "next";
}

/** Link editorial para um projeto vizinho: rótulo em text-label, título grande em font-display. */
function AdjacentLink({ project, direction }: AdjacentLinkProps) {
  const isNext = direction === "next";
  return (
    <Link
      href={`/trabalhos/${project.slug}`}
      className={`group flex min-h-11 flex-col gap-4 py-10 md:py-16 ${
        isNext ? "md:items-end md:text-right" : ""
      }`}
    >
      <span className="flex items-center gap-3 font-sans text-label text-ink-muted uppercase">
        {isNext ? (
          <>
            Próximo
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-ui ease-editorial group-hover:translate-x-1"
            >
              →
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-ui ease-editorial group-hover:-translate-x-1"
            >
              ←
            </span>
            Anterior
          </>
        )}
      </span>{" "}
      <span className="max-w-[16ch] font-display text-headline font-light text-ink transition-opacity duration-ui ease-editorial group-hover:opacity-70">
        {project.title}
      </span>
    </Link>
  );
}

export function ProjectNav({ previous, next }: ProjectNavProps) {
  const hasAdjacent = previous !== null || next !== null;

  return (
    <nav aria-label="Outros trabalhos" className="mx-auto max-w-page px-4 md:px-6 lg:px-10">
      {hasAdjacent ? (
        <ul role="list" className="grid grid-cols-1 border-t border-rule md:grid-cols-2">
          {previous ? (
            <li className="md:pr-8 lg:pr-12">
              <AdjacentLink project={previous} direction="previous" />
            </li>
          ) : null}
          {next ? (
            <li
              className={`border-t border-rule md:border-t-0 md:pl-8 lg:pl-12 ${
                previous ? "md:border-l" : "md:col-start-2"
              }`}
            >
              <AdjacentLink project={next} direction="next" />
            </li>
          ) : null}
        </ul>
      ) : null}
      <div className="flex justify-center border-t border-rule py-6">
        <Link
          href="/#trabalhos"
          className="inline-flex min-h-11 items-center px-3 font-sans text-label text-ink uppercase underline-offset-8 transition-colors duration-ui ease-editorial hover:underline"
        >
          Todos os trabalhos
        </Link>
      </div>
    </nav>
  );
}
