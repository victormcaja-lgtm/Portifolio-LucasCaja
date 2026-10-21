import Image from "next/image";
import { SITE } from "@/lib/site-config";
import type { ImageAsset } from "@/lib/types";

/**
 * Com object-cover em viewport mais estreita que a foto (3:2), a imagem é dimensionada pela
 * altura (100svh) e fica com 150svh de largura; em paisagem, ocupa a largura da viewport.
 */
const HERO_SIZES = "(max-aspect-ratio: 3/2) 150svh, 100vw";

interface HeroProps {
  image: ImageAsset;
}

export function Hero({ image }: HeroProps) {
  return (
    <section className="relative isolate flex h-svh min-h-[32rem] items-end overflow-hidden bg-ink text-paper">
      {/*
        Imagem LCP: no Next 16, `preload` só injeta um <link> no <head> e não pode ser
        combinado com `loading`/`fetchPriority`; usamos os atributos que chegam ao <img>.
      */}
      <Image
        src={image.src}
        alt={image.alt}
        fill
        loading="eager"
        fetchPriority="high"
        sizes={HERO_SIZES}
        className="-z-20 object-cover object-center"
      />
      {/* Véu em gradiente para garantir a legibilidade do texto sobre a fotografia. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-ink/70 via-ink/15 to-transparent"
      />
      {/*
        Véu superior sob o cabeçalho transparente: gradiente com várias paradas (globals.css,
        .hero-veil-top) que mantém ≥ 66% de tinta em toda a altura do cabeçalho — contraste AA
        do texto paper mesmo sobre céu claro — e se dissolve sem faixa chapada.
      */}
      <div aria-hidden="true" className="hero-veil-top absolute inset-x-0 top-0 -z-10 h-72 md:h-80" />

      <div className="mx-auto w-full max-w-page px-4 pr-12 pb-10 md:px-6 md:pr-24 md:pb-14 lg:px-10 lg:pr-28 lg:pb-16">
        <h1 className="font-display text-display font-light tracking-tight">{SITE.name}</h1>
        <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-2 font-sans text-label tracking-wide uppercase md:mt-8 md:gap-x-6 md:tracking-(--text-label--letter-spacing)">
          {SITE.disciplines.map((discipline) => (
            <li key={discipline}>{discipline}</li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden="true"
        className="absolute right-4 bottom-10 flex flex-col items-center gap-3 md:right-6 md:bottom-14 lg:right-10 lg:bottom-16"
      >
        <span className="font-sans text-label uppercase [writing-mode:vertical-rl]">Rolar</span>
        <span className="scroll-cue block h-16 w-px bg-paper/70" />
      </div>
    </section>
  );
}
