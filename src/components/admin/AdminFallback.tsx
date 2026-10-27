/** Fallback dos trechos que leem a sessão ou a URL (streaming com Cache Components). */
export function AdminFallback() {
  return (
    <p role="status" className="font-sans text-base text-ink-muted">
      Carregando…
    </p>
  );
}
