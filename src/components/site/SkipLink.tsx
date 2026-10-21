/** Link "Pular para o conteúdo": visível só ao receber foco; aponta para <main id="conteudo">. */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      data-skip-link=""
      className="sr-only z-60 bg-ink px-4 py-3 font-sans text-label text-paper uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:inline-flex focus:min-h-11 focus:items-center"
    >
      Pular para o conteúdo
    </a>
  );
}
