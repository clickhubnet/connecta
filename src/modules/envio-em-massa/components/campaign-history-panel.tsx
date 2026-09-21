"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, History, Search, Trash2, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { readCampaignHistory, writeCampaignHistory, type CampaignHistory } from "../history";

const statuses = {
  accepted: { label: "Aceita pela Meta", color: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200" },
  failed: { label: "Falha", color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
  uncertain: { label: "Sem confirmação", color: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
};
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function CampaignHistoryPanel() {
  const { data: user } = useCurrentUser();
  const [entries, setEntries] = useState<CampaignHistory[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState<CampaignHistory[] | null>(null);
  useEffect(() => {
    setEntries([]); setRemoved(null);
    if (!user?.id) return;
    try { setEntries(readCampaignHistory(user.id)); } catch { setError("Não foi possível ler o histórico salvo neste navegador."); }
  }, [user?.id]);
  const filtered = useMemo(() => entries.map((entry) => ({ ...entry, visibleContacts: entry.result.contacts.filter((contact) => (status === "all" || contact.status === status) && (!search.trim() || `${entry.title} ${contact.phone}`.toLowerCase().includes(search.toLowerCase().trim()))) })).filter((entry) => entry.visibleContacts.length), [entries, search, status]);
  function update(next: CampaignHistory[]) {
    if (!user?.id) return false;
    try { writeCampaignHistory(user.id, next); setEntries(next); setError(""); return true; } catch { setError("Não foi possível atualizar o histórico local."); return false; }
  }
  function remove(id?: string) {
    const previous = entries;
    if (update(id ? entries.filter((entry) => entry.id !== id) : [])) setRemoved(previous);
  }
  return <div className="space-y-5">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary"><History className="h-5 w-5" /></span><div><h2 className="text-base font-semibold">Histórico de campanhas</h2><p className="mt-1 text-xs text-muted-foreground">{entries.length} campanhas · registros desta conta neste navegador</p></div></div>
      <Button variant="ghost" className="rounded-xl text-destructive" disabled={!entries.length} onClick={() => remove()}><Trash2 className="h-4 w-4" />Limpar histórico local</Button>
    </section>
    <div className="flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar campanha ou telefone" placeholder="Pesquisar campanha ou telefone" className="rounded-xl bg-card pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select aria-label="Filtrar por resultado" className="h-10 rounded-xl border bg-card px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os resultados</option>{Object.entries(statuses).map(([key,item]) => <option key={key} value={key}>{item.label}</option>)}</select></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {removed && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-xs"><span>Histórico removido deste navegador.</span><Button size="sm" variant="ghost" onClick={() => { if (update(removed)) setRemoved(null); }}><RotateCcw className="h-3.5 w-3.5" />Desfazer</Button></div>}
    <p className="text-xs leading-5 text-muted-foreground">Aceite da API não confirma entrega ou leitura. Esses eventos ainda não estão vinculados ao histórico.</p>
    {filtered.map((entry, index) => <details key={entry.id} open={index === 0} className="overview-card overview-red relative isolate overflow-hidden rounded-2xl border border-border/70 bg-card">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden"><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{entry.title}</h3><p className="mt-1 text-xs text-muted-foreground">{dateLabel(entry.createdAt)} · {entry.mode === "text" ? "Texto livre" : "Template Meta"}</p></div><span className="flex items-center gap-3 text-xs text-muted-foreground">{entry.result.total} destinatários<ChevronDown className="h-4 w-4" /></span></summary>
      <div className="space-y-5 px-5 pb-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "Destinatários", value: entry.result.total }, { label: "Aceitas pela Meta", value: entry.result.accepted }, { label: "Sem confirmação", value: entry.result.uncertain }, { label: "Falhas", value: entry.result.failed }].map((item) => <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"><p className="text-[11px] text-muted-foreground">{item.label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p></div>)}</div>
        <div className="overflow-x-auto rounded-xl border border-border/60"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-muted/50 text-muted-foreground"><tr>{["Telefone", "Resultado", "Processamento", "Detalhes"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border/50">{entry.visibleContacts.map((contact,index) => <tr key={`${contact.phone}-${index}`} className="hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-4 font-medium tabular-nums">{contact.phone}</td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${statuses[contact.status].color}`}>{statuses[contact.status].label}</span></td><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{dateLabel(entry.createdAt)}</td><td className="max-w-sm break-words px-4 py-4 text-muted-foreground">{contact.detail}</td></tr>)}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-muted-foreground">{entry.visibleContacts.length} contatos exibidos</p><Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(entry.id)}><Trash2 className="h-3.5 w-3.5" />Remover registro</Button></div>
      </div>
    </details>)}
    {!filtered.length && <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center"><History className="mx-auto h-9 w-9 text-muted-foreground/50" /><h3 className="mt-4 text-sm font-semibold">{entries.length ? "Nenhum resultado para estes filtros" : "Seu histórico começa no próximo disparo"}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">{entries.length ? "Altere a busca ou o resultado selecionado." : "As próximas campanhas enviadas por esta conta serão registradas neste navegador. Testes individuais não entram no histórico."}</p><Button asChild variant="outline" className="mt-5 rounded-xl"><Link href="/envio-em-massa"><Send className="h-4 w-4" />Ir para disparos</Link></Button></div>}
  </div>;
}
