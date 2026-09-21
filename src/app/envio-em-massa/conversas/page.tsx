import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { DispatchConversations } from "@/modules/envio-em-massa/components/dispatch-conversations";

export default async function DispatchConversationsPage() {
  await requirePageAccess("/envio-em-massa/conversas");
  return <AppShell title="Conversas de disparos"><DispatchConversations /></AppShell>;
}
