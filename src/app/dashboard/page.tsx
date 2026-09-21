import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPanel } from "@/modules/dashboard/components/dashboard-panel";

export default async function DashboardPage() {
  await requirePageAccess("/dashboard");
  return (
    <AppShell title="Dashboard">
      <DashboardPanel />
    </AppShell>
  );
}
