import Link from "next/link";

export function NotFoundView() {
  return (
    <section className="mx-auto flex min-h-[80svh] max-w-page flex-col justify-end px-4 pt-40 pb-section md:px-6 lg:px-10">
      <span className="font-sans text-label text-ink-muted uppercase">Erro 404</span>
      <h1 className="mt-8 max-w-[12ch] font-display text-display font-light tracking-tight text-ink">
        Página não encontrada
      </h1>
      <div className="mt-12 grid gap-8 border-t border-rule pt-8 md:grid-cols-12 md:gap-x-6 lg:gap-x-8">
        <p className="max-w-[40ch] font-sans text-lg leading-relaxed text-ink-muted md:col-span-5 md:col-start-7 lg:col-span-4 lg:col-start-8">
          O endereço procurado não existe ou foi movido.
        </p>
        <div className="md:col-span-5 md:col-start-7 lg:col-span-4 lg:col-start-8">
          <Link
            href="/"
            className="-ml-3 inline-flex min-h-11 items-center px-3 font-sans text-label text-ink uppercase underline underline-offset-8 transition-colors duration-ui ease-editorial hover:text-ink-muted"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </section>
  );
}
