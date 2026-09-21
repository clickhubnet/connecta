"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3, CircleDollarSign, Megaphone, Users } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";

export type DashboardMetricsData = {
  newLeads: number;
  wonLeads: number;
  totalValue: number;
  expenses: number;
  showExpenses?: boolean;
};

type MetricIcons = Record<"newLeads" | "wonLeads" | "totalValue" | "dispatches", LucideIcon>;

const icons: MetricIcons = {
  newLeads: Users,
  wonLeads: BarChart3,
  totalValue: CircleDollarSign,
  dispatches: Megaphone,
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function DashboardMetrics({ data, loading, dispatches }: { data: DashboardMetricsData | null; loading: boolean; dispatches: number | null }) {

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Leads Novos"
        value={loading ? "..." : String(data?.newLeads ?? 0)}
        helper="Entraram hoje"
        icon={icons.newLeads}
        href="/leads?created=today"
      />
      <MetricCard
        title="Leads Fechados"
        tone="teal"
        value={loading ? "..." : String(data?.wonLeads ?? 0)}
        helper="Movidos para Fechado"
        icon={icons.wonLeads}
        href="/leads?status=WON"
      />
      <MetricCard
        title="Faturamento"
        tone="indigo"
        value={loading ? "..." : currency.format(data?.totalValue ?? 0)}
        helper="Planos fechados"
        icon={icons.totalValue}
        href="/leads?status=WON"
      />

        <MetricCard
          title="Disparos realizados"
          tone="amber"
          value={dispatches === null ? "—" : String(dispatches)}
          helper="Campanhas no período · histórico local"
          icon={icons.dispatches}
        />

    </div>
  );
}
