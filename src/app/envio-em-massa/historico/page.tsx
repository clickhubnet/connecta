import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { CampaignHistoryPanel } from "@/modules/envio-em-massa/components/campaign-history-panel";

export default async function CampaignHistoryPage() {
  await requirePageAccess("/envio-em-massa/historico");
  return <AppShell title="Histórico de disparos"><CampaignHistoryPanel /></AppShell>;
}
