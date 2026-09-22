"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardMetrics } from "@/modules/dashboard/components/dashboard-metrics";
import type { DashboardMetricsData } from "@/modules/dashboard/components/dashboard-metrics";
import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";
import type { DashboardOverviewData } from "@/modules/dashboard/components/dashboard-overview";
import {useReportRefresh} from "@/hooks/use-report-refresh";
import { useApiResource } from "@/hooks/use-api-resource";


type DashboardData = DashboardMetricsData & DashboardOverviewData & { dispatches: number };

export function DashboardPanel() {
  const [period, setPeriod] = useState("7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedPeriod, setAppliedPeriod] = useState("7");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setRefreshKey(Date.now());
    window.addEventListener("crm:dashboard-refresh", refresh);
    return () => {
      window.removeEventListener("crm:dashboard-refresh", refresh);
    };
  }, []);


  const dashboardUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("refresh", String(refreshKey));
    if (appliedPeriod !== "custom") {
      params.set("period", appliedPeriod);
    }
    if (appliedPeriod === "custom" && appliedFrom) params.set("from", appliedFrom);
    if (appliedPeriod === "custom" && appliedTo) params.set("to", appliedTo);
    const query = params.toString();
    return query ? `/api/dashboard?${query}` : "/api/dashboard";
  }, [appliedPeriod, appliedFrom, appliedTo, refreshKey]);

  const customPeriod = period === "custom";
  const dashboard = useApiResource<DashboardData>(dashboardUrl);
  useReportRefresh(dashboard.refresh);

  return (
    <div className="space-y-4">
      {dashboard.error ? <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{dashboard.error}</p> : null}
      <form aria-label="Filtros do relatório" className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3" onSubmit={(event) => {
        event.preventDefault();
        setAppliedPeriod(period);
        setAppliedFrom(customPeriod ? from : "");
        setAppliedTo(customPeriod ? to : "");
        setRefreshKey(Date.now());
      }}>
        <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CalendarDays className="h-4 w-4" aria-hidden="true" />Período</span>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label className="min-w-40 flex-1 sm:flex-none">
            <span className="sr-only">Período</span>
            <select
              className="h-9 w-full rounded-xl border border-input bg-background/60 px-3 text-sm transition-colors hover:border-primary/40"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">6 meses</option>
              <option value="365">1 ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          {customPeriod && <label className="min-w-36 flex-1 sm:flex-none">
            <span className="sr-only">Data inicial</span>
            <Input className="h-9 min-w-0 rounded-xl bg-background/60" disabled={!customPeriod} required={customPeriod} max={to || undefined} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>}
          {customPeriod && <label className="min-w-36 flex-1 sm:flex-none">
            <span className="sr-only">Data final</span>
            <Input className="h-9 min-w-0 rounded-xl bg-background/60" disabled={!customPeriod} required={customPeriod} min={from || undefined} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="submit"
            className="h-9 rounded-xl px-4 text-xs"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Atualizar
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-xl px-3 text-xs text-muted-foreground"
            onClick={() => {
              setFrom("");
              setTo("");
              setPeriod("7");
              setAppliedPeriod("7");
              setAppliedFrom("");
              setAppliedTo("");
              setRefreshKey(Date.now());
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Limpar
          </Button>
        </div>
      </form>
      <DashboardMetrics data={dashboard.data} loading={dashboard.loading} dispatches={dashboard.data?.dispatches??null} />

      <DashboardOverview data={dashboard.data} loading={dashboard.loading} />
    </div>
  );
}
