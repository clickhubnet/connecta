"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, FileUp, MapPin, Plus, Search, MapPinOff } from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApiResource } from "@/hooks/use-api-resource";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ApiResult } from "@/types/api";

type CepItem = {
  id?: string;
  cep: string;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  available: boolean;
  importedFrom?: string | null;
  importedAt?: string | null;
  source?: string;
} | null;

type CepOverview = {
  total: number;
  available: number;
  unavailable: number;
  recent: NonNullable<CepItem>[];
  cities: Array<{ city: string | null; state: string | null; count: number }>;
};

export function CepPanel() {
  const overview = useApiResource<CepOverview>("/api/ceps");
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.data?.role === "ADMIN";
  const [result, setResult] = useState<CepItem>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/ceps?cep=${formData.get("cep")}`);
    const data = (await response.json()) as ApiResult<CepItem>;
    if (data.status === "success") {
      setResult(data.data);
      setMessage(
        data.data
          ? data.data.source === "viacep"
            ? "CEP encontrado no ViaCEP, mas ainda sem cobertura cadastrada."
            : "CEP encontrado na base de cobertura."
          : "CEP nao encontrado.",
      );
    } else {
      setMessage(data.message);
    }
    setLoading(false);
  }

  async function handleManualCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/ceps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cep: formData.get("cep"),
        street: formData.get("street"),
        neighborhood: formData.get("neighborhood"),
        city: formData.get("city"),
        state: formData.get("state"),
        available: formData.get("available") === "on",
      }),
    });
    const data = (await response.json()) as ApiResult<CepItem>;
    setMessage(data.status === "success" ? "CEP salvo na base de cobertura." : data.message);
    if (data.status === "success") {
      form.reset();
      await overview.refresh();
    }
    setLoading(false);
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/ceps/import", { method: "POST", body: formData });
    const data = (await response.json()) as ApiResult<{ totalRows: number; imported: number }>;
    setMessage(
      data.status === "success"
        ? `${data.data.imported} CEPs importados de ${data.data.totalRows} linhas.`
        : data.message,
    );
    if (data.status === "success") {
      form.reset();
      await overview.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="management-page coverage-page space-y-5">
      <div className="management-toolbar flex items-center gap-3"><span className="management-heading-icon"><MapPin className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Área de cobertura</h2><p className="mt-1 text-xs text-muted-foreground">Consulte endereços e gerencie a disponibilidade de atendimento.</p></div></div>
      {overview.error && <p role="alert" className="text-sm text-destructive">{overview.error}</p>}
      {message && <p role="status" className="rounded-xl border bg-card px-4 py-3 text-sm">{message}</p>}
      {isAdmin ? <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="CEPs cadastrados" value={overview.loading ? "..." : String(overview.data?.total ?? 0)} helper="Endereços na base" icon={MapPin} />
        <MetricCard title="Com cobertura" value={overview.loading ? "..." : String(overview.data?.available ?? 0)} helper="Disponíveis para atendimento" icon={CheckCircle2} tone="teal" />
        <MetricCard title="Sem cobertura" value={overview.loading ? "..." : String(overview.data?.unavailable ?? 0)} helper="Sem disponibilidade cadastrada" icon={MapPinOff} tone="amber" />
      </div> : null}

      <div className={`grid gap-4 ${isAdmin ? "xl:grid-cols-[1.15fr_1fr]" : "max-w-2xl"}`}>
        <Card className="management-surface">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Consultar CEP</CardTitle>
            <CardDescription className="text-xs leading-relaxed">Confira a disponibilidade para o endereço do cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex gap-2" onSubmit={handleSearch}>
              <Input aria-label="CEP para consulta" name="cep" placeholder="Digite o CEP: 00000-000" inputMode="numeric" required />
              <Button disabled={loading} type="submit" aria-label="Consultar CEP" title="Consultar CEP">
                <Search className="h-4 w-4" aria-hidden="true" />Consultar
              </Button>
            </form>

            {result ? <div className="mt-4"><CepResult result={result} /></div> : <div className="mt-5 flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center"><MapPin className="h-7 w-7 text-primary/60" /><p className="text-xs text-muted-foreground">Informe um CEP para consultar o endereço e a cobertura.</p></div>}
          </CardContent>
        </Card>

        {isAdmin ? <Card className="management-surface">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Cadastrar cobertura</CardTitle>
            <CardDescription className="text-xs leading-relaxed">Adicione ou atualize um endereço na sua base.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleManualCreate}>
              <Input name="cep" placeholder="CEP" required />
              <Input name="street" placeholder="Logradouro" />
              <div className="grid grid-cols-2 gap-3">
                <Input name="neighborhood" placeholder="Bairro" />
                <Input name="city" placeholder="Cidade" />
              </div>
              <Input name="state" placeholder="UF" maxLength={2} />
              <label className="flex items-center gap-2 text-sm">
                <input className="h-4 w-4" name="available" type="checkbox" defaultChecked />
                <span>Com cobertura ativa</span>
              </label>
              <Button disabled={loading} type="submit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Salvar CEP
              </Button>
            </form>
          </CardContent>
        </Card> : null}
      </div>

      {isAdmin ? <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card className="management-surface">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Importar base</CardTitle>
            <CardDescription className="text-xs leading-relaxed">Arquivos XLSX ou CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4 rounded-xl border border-dashed border-primary/25 bg-primary/[.025] p-5" onSubmit={handleImport}>
              <Input accept=".xlsx,.xls,.csv" name="file" required type="file" />
              <Button disabled={loading} type="submit">
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Importar CEPs
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="management-surface">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Cidades com cobertura</CardTitle>
            <CardDescription className="text-xs leading-relaxed">Distribuição dos endereços na base atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.data?.cities.length ? (
              overview.data.cities.map((city) => (
                <div key={`${city.city}-${city.state}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
                  <span>{[city.city, city.state].filter(Boolean).join(" / ")}</span>
                  <span className="rounded-lg bg-primary/5 px-2 py-1 text-xs font-semibold text-primary tabular-nums">{city.count} CEPs</span>
                </div>
              ))
            ) : (
              <EmptyState text="Sem cidades cadastradas" />
            )}
          </CardContent>
        </Card>
      </div> : null}

      {isAdmin ? <Card className="management-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Últimos CEPs importados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overview.data?.recent.length ? (
              overview.data.recent.map((cep) => <CepResult key={cep.id ?? cep.cep} result={cep} compact />)
            ) : (
              <EmptyState text="Sem importações registradas" />
            )}
          </div>
        </CardContent>
      </Card> : null}
    </div>
  );
}

function CepResult({ result, compact = false }: { result: NonNullable<CepItem>; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {result.cep}
      </p>
      <p className="mt-2 text-muted-foreground">{result.street || "Sem logradouro"}</p>
      <p className="text-muted-foreground">
        {[result.neighborhood, result.city, result.state].filter(Boolean).join(" - ") || "Sem localização"}
      </p>
      <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${result.available ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{result.available ? "Com cobertura" : "Sem cobertura"}</p>
      {!compact && result.source ? <p className="text-xs text-muted-foreground">Origem: {result.source}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="col-span-full rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">{text}</p>;
}
