/**
 * Estado vazio da seção #trabalhos da home: sem projetos publicados, mostra só o título e uma
 * mensagem, sem filtro nem contador. Mantém o id "trabalhos" para o link "Trabalhos" do menu.
 */
export function EmptyWorks() {
  return (
    <section
      id="trabalhos"
      aria-labelledby="trabalhos-titulo"
      className="mx-auto max-w-page scroll-mt-16 px-4 py-section md:px-6 lg:px-10"
    >
      <div className="border-b border-rule pb-8 md:pb-10">
        <h2
          id="trabalhos-titulo"
          className="font-display text-headline leading-none font-light text-ink"
        >
          Trabalhos
        </h2>
      </div>
      <p className="mt-16 max-w-[60ch] font-sans text-base leading-relaxed text-ink-muted md:mt-24 md:text-lg">
        Nenhum trabalho publicado no momento.
      </p>
    </section>
  );
}
