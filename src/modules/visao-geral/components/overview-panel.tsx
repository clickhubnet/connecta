"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  Download,
  FileText,
  Users, TrendingUp, Receipt, MessageCircleMore, ListChecks, Trophy, Layers3, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {useReportRefresh} from "@/hooks/use-report-refresh";
import type {DispatchStatistics} from "@/modules/envio-em-massa/dispatch-statistics";
import { useApiResource } from "@/hooks/use-api-resource";

type OverviewData = {
  dispatches:DispatchStatistics;
  range: {
    preset: string;
    from: string;
    to: string;
    label: string;
  };
  summary: {
    leadsCreated: number;
    leadsWon: number;
    revenue: number;
    conversationsFinished: number;
    conversationsAssumed: number;
    conversationsBotActive: number;
    tasksCompleted: number;
    expensesTotal: number;
    expensesPaid: number;
    expensesPending: number;
    expensesOverdue: number;
  };
  leadStatuses: Array<{ status: string; label: string; count: number }>;
  planSales: Array<{ planName: string; count: number; totalValue: number }>;
  leadOwners: Array<{ userId: string; userName: string; totalLeads: number; wonLeads: number; openLeads: number; revenue: number }>;
  conversationBreakdown: Array<{ key: string; label: string; count: number }>;
  taskOwners: Array<{ userId: string; userName: string; total: number; completed: number; pending: number }>;
  expenseBreakdown: Array<{ status: string; label: string; count: number; totalAmount: number }>;
  timeline: Array<{ label: string; leads: number; sales: number; conversations: number; tasks: number; expenses: number }>;
};

const periodOptions = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "quarter", label: "3 meses" },
  { value: "semester", label: "6 meses" },
  { value: "year", label: "1 ano" },
  { value: "custom", label: "Período" },
];

const chartColors = ["#d71920", "#0d9488", "#4f46e5", "#d97706", "#737373", "#991b1b"];
const tooltipStyle = { borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 };

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function OverviewPanel() {
  const [revision,setRevision]=useState(0);
  const [period, setPeriod] = useState("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedPeriod, setAppliedPeriod] = useState("month");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const overviewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("preset", appliedPeriod);
    if (appliedPeriod === "custom" && appliedFrom) params.set("from", appliedFrom);
    if (appliedPeriod === "custom" && appliedTo) params.set("to", appliedTo);
    return `/api/overview?${params.toString()}&revision=${revision}`;
  }, [appliedFrom, appliedPeriod, appliedTo,revision]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("preset", appliedPeriod);
    if (appliedPeriod === "custom" && appliedFrom) params.set("from", appliedFrom);
    if (appliedPeriod === "custom" && appliedTo) params.set("to", appliedTo);
    return `/api/overview/export?${params.toString()}`;
  }, [appliedFrom, appliedPeriod, appliedTo,revision]);

  const overview = useApiResource<OverviewData>(overviewUrl);
  useReportRefresh(overview.refresh);
  const customPeriod = period === "custom";
  const data = overview.data;

  function applyFilters() {
    setRevision(value=>value+1);
    setAppliedPeriod(period);
    setAppliedFrom(period === "custom" ? from : "");
    setAppliedTo(period === "custom" ? to : "");
  }

  function clearFilters() {
    setRevision(value=>value+1);
    setPeriod("month");
    setFrom("");
    setTo("");
    setAppliedPeriod("month");
    setAppliedFrom("");
    setAppliedTo("");
  }

  function exportPdf() {
    if (!data) return;

    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) return;

    const rows = [
      ["Leads criados", String(data.summary.leadsCreated)],
      ["Leads ganhos", String(data.summary.leadsWon)],
      ["Receita", currency.format(data.summary.revenue)],
      ["Conversas finalizadas", String(data.summary.conversationsFinished)],
      ["Conversas assumidas", String(data.summary.conversationsAssumed)],
      ["Tarefas concluídas", String(data.summary.tasksCompleted)],
      ["Despesas totais", currency.format(data.summary.expensesTotal)],
    ]
      .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
      .join("");

    const employees = data.leadOwners.length
      ? data.leadOwners
          .map((item) => `<tr><td>${escapeHtml(item.userName)}</td><td>${item.totalLeads}</td><td>${item.wonLeads}</td><td>${currency.format(item.revenue)}</td></tr>`)
          .join("")
      : `<tr><td colspan="4">Sem dados no período.</td></tr>`;

    const plans = data.planSales.length
      ? data.planSales
          .map((item) => `<tr><td>${escapeHtml(item.planName)}</td><td>${item.count}</td><td>${currency.format(item.totalValue)}</td></tr>`)
          .join("")
      : `<tr><td colspan="3">Sem dados no período.</td></tr>`;

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <title>Visão Geral - CONNECTA TELECOM</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1, h2 { margin: 0 0 12px; }
            p { color: #475569; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
            .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 0; text-align: left; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Visão Geral CONNECTA TELECOM</h1>
          <p>Período: ${escapeHtml(data.range.label)}</p>
          <div class="grid">
            <div class="card">
              <h2>Resumo</h2>
              <table><tbody>${rows}</tbody></table>
            </div>
            <div class="card">
              <h2>Planos vendidos</h2>
              <table><thead><tr><th>Plano</th><th>Vendas</th><th>Receita</th></tr></thead><tbody>${plans}</tbody></table>
            </div>
            <div class="card">
              <h2>Distribuição por funcionário</h2>
              <table><thead><tr><th>Funcionário</th><th>Leads</th><th>Ganhos</th><th>Receita</th></tr></thead><tbody>${employees}</tbody></table>
            </div>
          </div>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="space-y-5">
      <form aria-label="Filtros da visão geral" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm" onSubmit={(event) => { event.preventDefault(); applyFilters(); }}>
        <label className="min-w-40 flex-1 space-y-1.5 sm:max-w-48"><span className="flex items-center gap-1.5 text-xs font-medium"><CalendarDays className="h-3.5 w-3.5 text-primary" />Período</span><select value={period} onChange={(event) => setPeriod(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm">{periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {customPeriod && <><label className="space-y-1.5"><span className="text-xs font-medium">De</span><Input className="rounded-xl" type="date" required max={to || undefined} value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="space-y-1.5"><span className="text-xs font-medium">Até</span><Input className="rounded-xl" type="date" required min={from || undefined} value={to} onChange={(event) => setTo(event.target.value)} /></label></>}
        <Button type="submit" className="rounded-xl">Aplicar</Button><Button type="button" variant="ghost" className="rounded-xl text-muted-foreground" onClick={clearFilters}><RotateCcw className="h-3.5 w-3.5" />Limpar</Button>
        <div className="flex flex-wrap gap-2 sm:ml-auto"><Button type="button" variant="outline" className="rounded-xl" asChild><a href={exportUrl}><Download className="h-4 w-4" />Excel</a></Button><Button type="button" variant="outline" className="rounded-xl" onClick={exportPdf} disabled={!data}><FileText className="h-4 w-4" />PDF</Button></div>
      </form>
      <Card className="rounded-2xl border-border/70 p-5">
        <h2 className="text-base font-semibold">Disparos em massa</h2>
        <p className="mt-1 text-xs text-muted-foreground">Resultados registrados no servidor para o período selecionado.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Disparos efetuados",data?.dispatches.total],["Bem-sucedidos · aceitos pela Meta",data?.dispatches.accepted],["Com falhas",data?.dispatches.failed],["Sem confirmação",data?.dispatches.uncertain]].map(([label,value])=><div key={String(label)} className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{overview.loading?"—":Number(value??0).toLocaleString("pt-BR")}</p></div>)}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Aceita pela Meta não significa entregue. Falhas antigas salvas somente no navegador não estão incluídas.</p>
      </Card>
      {overview.error && <p role="alert" className="rounded-xl border border-destructive/20 bg-card p-4 text-sm text-destructive">{overview.error}</p>}
      <p aria-live="polite" className="px-1 text-xs text-muted-foreground">{overview.loading ? "Atualizando relatório…" : data?.range.label ?? "Relatório indisponível"}</p>
      <section aria-label="Leitura da operação" className="rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-sm font-semibold">Leitura da operação</h2><span className="text-xs text-muted-foreground">Atendimento e produtividade no período</span></div>
        <div className="grid gap-5 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border/70">
          {[
            { label: "Conversas finalizadas", value: data?.summary.conversationsFinished, detail: "Atendimentos encerrados pelo chatbot", icon: MessageCircleMore, tone: "text-primary" },
            { label: "Conversas assumidas", value: data?.summary.conversationsAssumed, detail: "Atendimentos assumidos pela equipe", icon: Users, tone: "text-indigo-600 dark:text-indigo-300" },
            { label: "Tarefas concluídas", value: data?.summary.tasksCompleted, detail: "Atividades finalizadas no período", icon: ListChecks, tone: "text-teal-700 dark:text-teal-300" },
          ].map(({ label, value, detail, icon: Icon, tone }, index) => <div key={label} className={index ? "md:pl-6" : "md:pr-6"}>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon aria-hidden="true" className={`h-4 w-4 ${tone}`} />{label}</div>
            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">{overview.loading ? "—" : formatNumber(value)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
          </div>)}
        </div>
      </section>
      <div className="grid items-stretch gap-5 xl:grid-cols-12">
        <ReportCard title="Evolução da operação" description="Leads e vendas ao longo do período" icon={TrendingUp} className="xl:col-span-8" tone="red">
          {data?.timeline.length ? <><div className="h-64 sm:h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={data.timeline} margin={{ left: -20, right: 8, top: 10 }}>
            <defs><linearGradient id="overview-leads" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#d71920" stopOpacity={0.2} /><stop offset="100%" stopColor="#d71920" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={tooltipStyle} />
            <Area name="Leads" dataKey="leads" type="monotone" stroke="#d71920" strokeWidth={2.5} fill="url(#overview-leads)" isAnimationActive={false} /><Area name="Vendas" dataKey="sales" type="monotone" stroke="#0d9488" strokeWidth={2.5} fill="transparent" isAnimationActive={false} />
          </AreaChart></ResponsiveContainer></div><div className="mt-4 flex gap-5 border-t pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" />Leads</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-teal-600" />Vendas</span></div></> : <EmptyReport loading={overview.loading} />}
        </ReportCard>
        <ReportCard title="Status dos leads" description="Distribuição por etapa do funil" icon={Layers3} className="xl:col-span-4" tone="teal">
          <div className="space-y-4">{data?.leadStatuses.length ? data.leadStatuses.map((item, index) => <ReportBar key={item.status} label={item.label} value={item.count} total={data.leadStatuses.reduce((sum, row) => sum + row.count, 0)} color={chartColors[index % chartColors.length]} />) : <EmptyReport loading={overview.loading} />}</div>
        </ReportCard>
        <ReportCard title="Desempenho da equipe" description="Leads, vendas e faturamento por responsável" icon={Users} className="xl:col-span-8" tone="indigo">
          <div className="space-y-3">{data?.leadOwners.length ? data.leadOwners.map((item) => <div key={item.userId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{item.userName.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("")}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.userName}</p><p className="mt-1 text-xs text-muted-foreground">{item.totalLeads} leads · {item.wonLeads} vendas · {item.openLeads} em aberto</p></div><strong className="text-sm font-semibold tabular-nums">{currency.format(item.revenue)}</strong></div>) : <EmptyReport loading={overview.loading} />}</div>
        </ReportCard>
        <ReportCard title="Planos vendidos" description="Ranking de vendas por plano" icon={Trophy} className="xl:col-span-4" tone="amber">
          <div className="space-y-4">{data?.planSales.length ? [...data.planSales].sort((a,b) => b.count-a.count).map((item,index) => <div key={item.planName} className="rounded-xl border border-border/60 p-3"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-semibold">{index+1}. {item.planName}</p><strong className="text-xs font-semibold tabular-nums">{currency.format(item.totalValue)}</strong></div><ReportBar label="Vendas" value={item.count} total={Math.max(1,...data.planSales.map((row)=>row.count))} color="#d71920" /></div>) : <EmptyReport loading={overview.loading} />}</div>
        </ReportCard>
        <ReportCard title="Atendimento" description="Chatbot e equipe no período selecionado" icon={MessageCircleMore} className="xl:col-span-4" tone="red">
          <div className="space-y-5">{data?.conversationBreakdown.length ? data.conversationBreakdown.map((item,index) => <ReportBar key={item.key} label={item.label} value={item.count} total={Math.max(1,...data.conversationBreakdown.map((row)=>row.count))} color={chartColors[index % chartColors.length]} />) : <EmptyReport loading={overview.loading} />}</div>
        </ReportCard>
        <ReportCard title="Tarefas da equipe" description="Conclusões e pendências por responsável" icon={ListChecks} className="xl:col-span-4" tone="teal">
          <p className="mb-5 text-xs text-muted-foreground"><strong className="mr-2 text-xl font-semibold text-foreground">{overview.loading ? "—" : formatNumber(data?.summary.tasksCompleted)}</strong>concluídas no período</p><div className="space-y-4">{data?.taskOwners.length ? data.taskOwners.map((item) => <div key={item.userId}><ReportBar label={item.userName} value={item.completed} total={item.total} color="#0d9488" /><p className="mt-1 text-[11px] text-muted-foreground">{item.completed} concluídas · {item.pending} pendentes</p></div>) : <EmptyReport loading={overview.loading} />}</div>
        </ReportCard>
        <ReportCard title="Resumo financeiro" description="Vendas e despesas no período" icon={Receipt} className="xl:col-span-4" tone="amber">
          <div className="space-y-3">{[
            ["Faturamento", data?.summary.revenue], ["Despesas totais", data?.summary.expensesTotal], ["Pagas", data?.summary.expensesPaid], ["Pendentes", data?.summary.expensesPending], ["Atrasadas", data?.summary.expensesOverdue],
          ].map(([label,value])=><div key={String(label)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-3"><span className="text-xs text-muted-foreground">{label}</span><strong className="text-sm font-semibold tabular-nums">{overview.loading ? "—" : currency.format(Number(value ?? 0))}</strong></div>)}</div>
        </ReportCard>
      </div>
    </div>
  );
}

function ReportCard({ title, description, icon: Icon, children, className, tone }: { title: string; description: string; icon: typeof Users; children: ReactNode; className: string; tone: string }) {
  return <Card className={`overview-card overview-${tone} relative isolate min-w-0 overflow-hidden rounded-2xl border-border/70 bg-card p-5 sm:p-6 ${className}`}><div className="mb-6 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" /></span><div><h2 className="text-sm font-bold text-foreground">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div></div>{children}</Card>;
}
function EmptyReport({ loading }: { loading: boolean }) { return <p role="status" className="grid min-h-32 place-items-center rounded-xl bg-muted/30 p-4 text-center text-sm text-muted-foreground">{loading ? "Carregando informações…" : "Sem registros no período selecionado."}</p>; }
function ReportBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return <div><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="font-medium">{label}</span><strong className="font-semibold tabular-nums">{formatNumber(value)}</strong></div><div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.min(100, value / Math.max(1,total)*100)}%`, background: color }} /></div></div>;
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
