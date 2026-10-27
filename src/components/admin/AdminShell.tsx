import Link from "next/link";
import type { ReactNode } from "react";
import { SkipLink } from "@/components/site/SkipLink";
import { SITE } from "@/lib/site-config";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Layout mínimo da área administrativa: nome do site, rótulo "Admin" e o link "Ver site".
 * Não usa o SiteHeader/SiteFooter públicos.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <>
      <SkipLink />
      <header className="border-b border-rule">
        <div className="mx-auto flex min-h-16 max-w-page items-center justify-between gap-6 px-4 md:min-h-20 md:px-6 lg:px-10">
          <p className="flex items-baseline gap-4">
            <span className="font-display text-title text-ink">{SITE.name}</span>
            <span className="font-sans text-label text-ink-muted uppercase">Admin</span>
          </p>
          <Link
            href="/"
            className="-mr-3 inline-flex min-h-11 items-center px-3 font-sans text-label text-ink uppercase underline-offset-8 transition-colors duration-ui ease-editorial hover:text-ink-muted hover:underline"
          >
            Ver site
          </Link>
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        <div className="mx-auto max-w-page px-4 pt-16 pb-section md:px-6 md:pt-24 lg:px-10">
          {children}
        </div>
      </main>
    </>
  );
}
