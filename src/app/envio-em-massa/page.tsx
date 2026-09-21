import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { MassMessagePanel } from "@/modules/envio-em-massa/components/mass-message-panel";

export default async function EnvioEmMassaPage() {
  await requirePageAccess("/envio-em-massa");
  return (
    <AppShell title="Disparos">
      <MassMessagePanel />
    </AppShell>
  );
}
