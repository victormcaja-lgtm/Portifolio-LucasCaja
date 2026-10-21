export function DemoNotice() {
  return (
    <div role="note" className="border-y border-signal/30 bg-paper text-signal">
      <p className="mx-auto flex max-w-page flex-col gap-1 px-4 py-4 font-sans text-sm leading-relaxed md:flex-row md:items-baseline md:gap-6 md:px-6 lg:px-10">
        <strong className="text-label font-medium uppercase">Conteúdo de demonstração</strong>
        <span>
          As imagens e os textos desta página são provisórios e serão substituídos pelo acervo
          definitivo.
        </span>
      </p>
    </div>
  );
}
