import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { ExpensePanel } from "@/modules/despesas/components/expense-panel";

export default async function DespesasPage() {
  await requirePageAccess("/despesas");
  return <AppShell title="Despesas"><ExpensePanel /></AppShell>;
}
