import { AppShell } from "@/components/layout/app-shell";

export default function AccessDeniedPage() {
  return <AppShell title="Acesso restrito"><div className="management-surface border bg-card p-8 text-center"><h1 className="text-lg font-semibold">Você não tem acesso a esta aba</h1><p className="mt-2 text-sm text-muted-foreground">Escolha uma aba disponível no menu ou solicite acesso ao administrador.</p></div></AppShell>;
}
