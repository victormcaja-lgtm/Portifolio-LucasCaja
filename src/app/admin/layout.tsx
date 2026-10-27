import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

/** Área administrativa: fora dos buscadores e sem o cabeçalho/rodapé públicos. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
