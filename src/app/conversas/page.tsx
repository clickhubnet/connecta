import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { ConversationCenter } from "@/modules/conversas/components/conversation-center";

export default async function ConversasPage() {
  await requirePageAccess("/conversas");
  return (
    <AppShell title="Chatbot">
      <ConversationCenter />
    </AppShell>
  );
}
