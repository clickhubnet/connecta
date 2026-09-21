import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { WhatsappAccountsPanel } from "@/modules/envio-em-massa/components/whatsapp-accounts-panel";

export default async function MassMessageAccountsPage() {
  await requirePageAccess("/envio-em-massa/configuracoes");
  return (
    <AppShell title="Contas">
      <WhatsappAccountsPanel />
    </AppShell>
  );
}
