import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { AppointmentBoard } from "@/modules/compromissos/components/appointment-board";

export default async function CompromissosPage() {
  await requirePageAccess("/compromissos");
  return (
    <AppShell title="Compromissos">
      <AppointmentBoard />
    </AppShell>
  );
}
