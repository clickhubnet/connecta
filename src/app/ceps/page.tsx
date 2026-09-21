import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { CepPanel } from "@/modules/ceps/components/cep-panel";

export default async function CepsPage() {
  await requirePageAccess("/ceps");
  return (
    <AppShell title="Cobertura">
      <CepPanel />
    </AppShell>
  );
}
