"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { ArrowUpRight, TrendingUp, Layers3, Users, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

const statusLabels: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contato",
  QUALIFIED: "Qualificado",
  PROPOSAL: "Proposta",
  WON: "Fechado",
  LOST: "Perdido",
};

const statusOrder = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
const statusTones: Record<string, string> = {
  NEW: "bg-red-500/10 text-red-700 dark:text-red-300",
  CONTACTED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  QUALIFIED: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  PROPOSAL: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  WON: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  LOST: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};
const tooltipStyle = { borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12, boxShadow: "0 8px 32px rgba(20,20,20,0.08)" };

export type DashboardOverviewData = {
  leadStatuses: Array<{ status: string; count: number }>;
  leadChart: Array<{ date: string; label: string; count: number }>;
  planSales: Array<{ planId: string | null; planName: string; count: number; totalValue: number }>;
  recentLeads: Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
    city: string | null;
    state: string | null;
    planName: string | null;
    assignedUserName: string | null;
    expectedValue: number;
    createdAt: string;
  }>;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function SectionHeading({ title, description, icon: Icon, tone = "red" }: { title: string; description: string; icon: typeof Users; tone?: "red" | "teal" | "indigo" | "amber" }) {
  const tones = { red: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300", teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300", indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300", amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" };
  return <div className="flex items-start gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" /></span><div><h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2><p className="mt-1 text-xs leading-5 text-foreground/65">{description}</p></div></div>;
}

export function DashboardOverview({ data, loading }: { data: DashboardOverviewData | null; loading: boolean }) {
  const funnelData = statusOrder.map((status) => ({ status, label: statusLabels[status], count: data?.leadStatuses.find((item) => item.status === status)?.count ?? 0 }));
  const total = funnelData.reduce((sum, item) => sum + item.count, 0);
  const chartData = data?.leadChart ?? [];
  const chartTotal = chartData.reduce((sum, item) => sum + item.count, 0);
  const planData = [...(data?.planSales ?? [])].sort((a, b) => b.count - a.count);
  const sales = planData.reduce((sum, item) => sum + item.count, 0);
  const cardStyle = "overview-card relative isolate min-w-0 overflow-hidden rounded-2xl border-border/70 bg-card p-5 sm:p-6";

  return (
    <div className="grid items-stretch gap-5 xl:grid-cols-12">
      <Card className={`${cardStyle} overview-red xl:col-span-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading title="Evolução das oportunidades" description="Novos contatos ao longo do período selecionado" icon={TrendingUp} />
          <div className="rounded-xl border border-border/60 bg-card/95 px-4 py-3 text-right"><p className="text-xl font-semibold tracking-tight tabular-nums">{loading ? "—" : chartTotal.toLocaleString("pt-BR")}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Entradas no período</p></div>
        </div>
        <div className="mt-7 h-64 sm:h-72">
          {loading || !chartData.length ? <div role="status" className="grid h-full place-items-center rounded-xl bg-muted/30 text-sm text-muted-foreground">{loading ? "Carregando evolução..." : "Nenhuma oportunidade neste período."}</div> :
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart accessibilityLayer data={chartData} margin={{ left: -22, right: 8, top: 10, bottom: 0 }}>
              <defs><linearGradient id="lead-area-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d71920" stopOpacity={0.22} /><stop offset="100%" stopColor="#d71920" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} minTickGap={28} dy={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area name="Leads" type="monotone" dataKey="count" stroke="#d71920" strokeWidth={3} fill="url(#lead-area-fill)" activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Oportunidades recebidas por dia</div>
      </Card>

      <Card className={`${cardStyle} overview-amber xl:col-span-4`}>
        <SectionHeading title="Planos em destaque" description="Ranking por número de vendas concluídas" icon={Trophy} tone="amber" />
        <div className="my-5 flex flex-wrap items-baseline gap-2 rounded-xl border border-border/60 bg-background/80 p-4"><strong className="text-xl font-semibold tabular-nums">{loading ? "—" : sales.toLocaleString("pt-BR")}</strong><span className="text-xs text-muted-foreground">vendas entre os planos listados</span></div>
        <div className="max-h-72 space-y-5 overflow-y-auto pr-1">
          {loading ? <p role="status" className="py-8 text-sm text-muted-foreground">Carregando planos...</p> : planData.length ? planData.map((item, index) => (
            <div key={item.planId ?? item.planName} className="flex gap-3 rounded-xl border border-border/60 bg-card/95 p-3 transition-colors hover:border-amber-500/40">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${index === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold">{item.planName}</p><span className="text-xs font-semibold tabular-nums">{currency.format(item.totalValue)}</span></div>
              <div aria-hidden="true" className="my-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${item.count / Math.max(1, ...planData.map((plan) => plan.count)) * 100}%`, opacity: index === 0 ? 1 : 0.6 }} /></div>
              <p className="text-[11px] text-muted-foreground">{item.count} vendas</p></div>
            </div>
          )) : <p className="py-8 text-sm text-muted-foreground">Os planos aparecerão aqui após as primeiras vendas.</p>}
        </div>
      </Card>

      <Card className={`${cardStyle} overview-teal xl:col-span-4`}>
        <SectionHeading title="Seu funil, em perspectiva" description="Distribuição atual das oportunidades" icon={Layers3} tone="teal" />
        <div className="my-5 flex flex-wrap items-baseline gap-2 rounded-xl border border-border/60 bg-background/80 p-4"><strong className="text-xl font-semibold tabular-nums">{loading ? "—" : total.toLocaleString("pt-BR")}</strong><span className="text-xs text-muted-foreground">oportunidades no funil</span></div>
        <div className="space-y-3">
          {funnelData.map((item, index) => <div key={item.status} className="rounded-xl border border-border/60 bg-card/95 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-medium"><span className="text-[10px] text-muted-foreground">0{index + 1}</span>{item.label}</span><span className="tabular-nums"><strong>{loading ? "—" : item.count}</strong><span className="ml-2 text-muted-foreground">{loading ? "" : `${total ? Math.round(item.count / total * 100) : 0}%`}</span></span></div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${item.status === "WON" ? "bg-teal-600" : item.status === "LOST" ? "bg-neutral-400" : "bg-primary"}`} style={{ width: `${total ? item.count / total * 100 : 0}%` }} /></div>
          </div>)}
        </div>
      </Card>

      <Card className={`${cardStyle} overview-indigo xl:col-span-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4"><SectionHeading title="Últimas conexões" description="Contatos recentes e suas próximas oportunidades" icon={Users} tone="indigo" /><Link href="/leads" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-accent">Ver leads <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
        <div className="mt-6">
          {loading ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">Carregando contatos...</p> : data?.recentLeads.length ? <div className="space-y-2">{data.recentLeads.map((lead) => (
            <div key={lead.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card/90 p-4 transition-colors hover:bg-muted/30 sm:flex-nowrap sm:gap-4">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{lead.name.split(" ").filter(Boolean).slice(0, 2).map((name) => name[0]).join("")}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{lead.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{lead.phone}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span className="font-medium text-foreground/80">{lead.planName ?? "Plano não definido"}</span>
                  <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span className="text-muted-foreground">{lead.assignedUserName ?? "Sem responsável"}</span>
                </div>
              </div>
              <div className="flex w-full shrink-0 items-center justify-between gap-3 border-t border-border/50 pt-3 sm:w-auto sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTones[lead.status] ?? "bg-muted text-muted-foreground"}`}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabels[lead.status] ?? lead.status}</span>
                <p className="text-sm font-semibold tracking-tight tabular-nums">{currency.format(lead.expectedValue)}</p>
              </div>
            </div>
          ))}</div> : <p className="py-12 text-center text-sm text-muted-foreground">Seus novos contatos aparecerão aqui.</p>}
        </div>
      </Card>
    </div>
  );
}
