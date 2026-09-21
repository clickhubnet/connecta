import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { WhatsappNumberChecker } from "@/modules/envio-em-massa/components/whatsapp-number-checker";

export default async function VerifyWhatsappPage() {
  await requirePageAccess("/envio-em-massa/verificar-whatsapp");
  return (
    <AppShell title="Verificar WhatsApp">
      <WhatsappNumberChecker />
    </AppShell>
  );
}
