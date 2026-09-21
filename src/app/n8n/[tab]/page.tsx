import { requirePageAccess } from "@/lib/page-access";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AgentCenter } from "@/modules/n8n/components/agent-center";

const tabs = { agents: "Agentes", plans: "Planos", flow: "Fluxo de Mensagens", openai: "OpenAI" };

export default async function SalesSectionPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!Object.prototype.hasOwnProperty.call(tabs, tab)) notFound();
  await requirePageAccess(`/n8n/${tab}`);
  const selectedTab = tab as keyof typeof tabs;
  return <AppShell title={tabs[selectedTab]}><AgentCenter key={selectedTab} initialTab={selectedTab} standalone /></AppShell>;
}
