import { requirePageAccess } from "@/lib/page-access";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LeadBoard } from "@/modules/leads/components/lead-board";

export default async function LeadsPage() {
  await requirePageAccess("/leads");
  return (
    <AppShell title="Leads">
      <Suspense>
        <LeadBoard />
      </Suspense>
    </AppShell>
  );
}
