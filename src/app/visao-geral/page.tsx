import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { OverviewPanel } from "@/modules/visao-geral/components/overview-panel";

export default async function OverviewPage() {
  await requirePageAccess("/visao-geral");
  return (
    <AppShell title="Visão Geral">
      <OverviewPanel />
    </AppShell>
  );
}
