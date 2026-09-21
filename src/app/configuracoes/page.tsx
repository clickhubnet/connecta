import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsPanel } from "@/modules/configuracoes/components/settings-panel";

export default async function ConfiguracoesPage() {
  await requirePageAccess("/configuracoes");
  return (
    <AppShell title="Configurações">
      <SettingsPanel />
    </AppShell>
  );
}
