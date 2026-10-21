import { SITE } from "@/lib/site-config";
import type { ImageCredit } from "@/lib/types";

/**
 * Ano exibido no rodapé, avaliado ao carregar o módulo (no build, para a página estática),
 * fora da renderização — ler o relógio durante o prerender é bloqueado com Cache Components.
 */
const CURRENT_YEAR = new Date().getFullYear();

interface SiteFooterProps {
  credits: readonly ImageCredit[];
}

export function SiteFooter({ credits }: SiteFooterProps) {
  return (
    <footer id="contato" className="scroll-mt-16 border-t border-rule bg-paper text-ink">
      <div className="mx-auto max-w-page px-4 pt-section pb-10 md:px-6 lg:px-10">
        <div className="grid gap-12 md:grid-cols-12 md:gap-x-6 lg:gap-x-8">
          <div className="md:col-span-7">
            <h2 className="font-display text-headline leading-none font-light">Contato</h2>
            <p className="mt-6 max-w-[60ch] font-sans text-lg leading-relaxed text-ink-muted">
              Informações de contato em breve.
            </p>
          </div>

          {credits.length > 0 ? (
            <div className="md:col-span-4 md:col-start-9">
              <h3 className="font-sans text-label text-ink uppercase">Créditos das imagens</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-muted">
                Fotografias de demonstração do Unsplash, servidas via Picsum.
              </p>
              <ul className="mt-4 flex flex-col">
                {credits.map((credit) => (
                  <li key={`${credit.author}|${credit.sourceUrl}`}>
                    <a
                      href={credit.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center font-sans text-label text-ink-muted uppercase underline-offset-4 transition-colors duration-ui ease-editorial hover:text-ink hover:underline focus-visible:outline-ink"
                    >
                      {credit.author}
                      <span className="sr-only"> (Unsplash, abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-24 flex flex-col gap-2 border-t border-rule pt-6 font-sans text-label text-ink-muted uppercase md:flex-row md:justify-between">
          <p>
            © {CURRENT_YEAR} {SITE.name}
          </p>
          <p>Fotografia &amp; Filme</p>
        </div>
      </div>
    </footer>
  );
}
