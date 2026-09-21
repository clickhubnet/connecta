import type { DashboardMetricsData } from "./components/dashboard-metrics";
import type { DashboardOverviewData } from "./components/dashboard-overview";

export function createDemoDashboard(period: string, from: string, to: string): DashboardMetricsData & DashboardOverviewData {
  const end = period === "custom" && to ? new Date(`${to}T12:00:00`) : new Date();
  const days = period === "custom" && from
    ? Math.max(1, Math.min(366, Math.round((end.getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000) + 1))
    : Number(period) || 7;
  const leadChart = Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setDate(date.getDate() - days + index + 1);
    return { date: date.toISOString(), label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), count: [18, 32, 24, 41, 29, 53, 38][index % 7] };
  });
  const planSales = [
    { planId: "demo-600", planName: "Fibra 600 Mega", count: 24, totalValue: 2877.6 },
    { planId: "demo-1g", planName: "Fibra 1 Giga", count: 16, totalValue: 2558.4 },
    { planId: "demo-400", planName: "Fibra 400 Mega", count: 12, totalValue: 1078.8 },
    { planId: "demo-emp", planName: "Empresarial", count: 8, totalValue: 2399.2 },
  ];
  return {
    newLeads: 38, wonLeads: 60, totalValue: 8914, expenses: 1240.5, showExpenses: true,
    leadChart, planSales,
    leadStatuses: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"].map((status, index) => ({ status, count: [72, 54, 36, 28, 60, 14][index] })),
    recentLeads: ["Marina Exemplo", "Rafael Exemplo", "Camila Exemplo", "Lucas Exemplo", "Beatriz Exemplo"].map((name, index) => ({
      id: `demo-${index}`, name, phone: "Contato demonstrativo", status: ["NEW", "PROPOSAL", "WON", "QUALIFIED", "CONTACTED"][index],
      city: null, state: null, planName: planSales[index % 4].planName,
      assignedUserName: ["Equipe Comercial", "Equipe Atendimento"][index % 2],
      expectedValue: [119.9, 159.9, 89.9, 299.9, 119.9][index], createdAt: end.toISOString(),
    })),
  };
}
