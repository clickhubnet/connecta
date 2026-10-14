"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, History, Search, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useApiResource } from "@/hooks/use-api-resource";
import { useReportRefresh } from "@/hooks/use-report-refresh";
import { readCampaignHistory } from "../history";
import { applyDeliveryEvents, type DeliveryState } from "../delivery-status";
import type { DispatchHistoryEntry, DispatchHistoryPage } from "../dispatch-history";

const statuses: Record<DeliveryState, { label: string; color: string }> = {
  accepted: { label: "Aguardando envio", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  sent: { label: "Enviada", color: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  delivered: { label: "Entregue", color: "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200" },
  read: { label: "Lida", color: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  failed: { label: "Falhou", color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" },
  uncertain: { label: "Sem confirmação", color: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
};
const dateLabel = (value: string) => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium" });

export function CampaignHistoryPanel() {
  const { data: user } = useCurrentUser();
  const [entries, setEntries] = useState<DispatchHistoryEntry[]>([]);
  const [localEntries, setLocalEntries] = useState<DispatchHistoryEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [localError, setLocalError] = useState("");
  const history = useApiResource<DispatchHistoryPage>(`/api/envio-em-massa/historico?offset=${offset}&account=${user?.id ?? ""}`, Boolean(user?.id));
  useReportRefresh(history.refresh);
  useEffect(() => {
    setEntries([]); setLocalEntries([]); setOffset(0); setLocalError("");
    if (!user?.id) return;
    try {
      setLocalEntries(readCampaignHistory(user.id).map(entry => ({
        id: entry.id, createdAt: entry.createdAt, title: entry.title, mode: entry.mode, sender: "Sua conta", isTest: false,
        total: entry.result.total, accepted: entry.result.accepted, failed: entry.result.failed, uncertain: entry.result.uncertain,
        missingContacts: 0, contacts: entry.result.contacts.map(contact => applyDeliveryEvents(contact, [])),
      })));
    } catch { setLocalError("Não foi possível ler os registros antigos deste navegador. Os registros no servidor continuam disponíveis."); }
  }, [user?.id]);
  useEffect(() => {
    if (!history.data) return;
    setEntries(previous => {
      const map = new Map(previous.map(entry => [entry.id, entry]));
      history.data!.entries.forEach(entry => map.set(entry.id, entry));
      return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }, [history.data]);
  const filtered = useMemo(() => entries.map(entry => ({
    ...entry,
    visibleContacts: entry.contacts.filter(contact => (status === "all" || contact.status === status) &&
      (!search.trim() || `${entry.title} ${entry.sender} ${contact.phone}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))),
  })).filter(entry => entry.visibleContacts.length || (status === "all" && !search.trim() && entry.missingContacts > 0)), [entries, search, status]);
  const loadingMore = Boolean(history.data && offset > history.data.offset && !history.error);
  return <div className="space-y-5">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3"><History className="h-6 w-6 text-primary" /><div><h2 className="text-base font-semibold">Histórico de disparos</h2><p className="mt-1 text-xs text-muted-foreground">{history.data?.total ?? "—"} campanhas e testes salvos · horários de Brasília</p></div></div>
      <Button variant="outline" onClick={() => { if (offset) setOffset(0); else void history.refresh(); }}><RotateCcw className="h-4 w-4" />Atualizar resultados</Button>
    </section>
    <p className="text-sm leading-6 text-muted-foreground">Acompanhe cada destinatário: pedido recebido, mensagem enviada, entregue, lida ou com falha. A confirmação de entrega e leitura aparece quando o WhatsApp a informa. A leitura pode não ser informada quando o destinatário desativa essa opção. Confirmações de campanhas antigas que não foram guardadas não podem ser recuperadas.</p>
    <div className="flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar nos registros carregados" placeholder="Pesquisar telefone, campanha ou responsável nos registros carregados" className="rounded-xl bg-card pl-9" value={search} onChange={event => setSearch(event.target.value)} /></div><select aria-label="Filtrar por resultado" className="h-10 rounded-xl border bg-card px-3 text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos os resultados</option>{Object.entries(statuses).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></div>
    {history.error && <p role="alert" className="text-sm text-destructive">{history.error}</p>}
    {localError && <p role="alert" className="text-sm text-destructive">{localError}</p>}
    {history.loading && <p role="status" className="text-sm text-muted-foreground">Carregando histórico…</p>}
    {filtered.map((entry, index) => <CampaignCard key={entry.id} entry={entry} open={index === 0} />)}
    {!history.loading && !history.error && !filtered.length && <div className="rounded-2xl border border-dashed bg-card p-8 text-center"><p>{entries.length ? "Nenhum destinatário corresponde a estes filtros nos registros carregados." : "Nenhuma campanha registrada no servidor."}</p><Button asChild variant="outline" className="mt-4"><Link href="/envio-em-massa"><Send className="h-4 w-4" />Ir para disparos</Link></Button></div>}
    {history.data?.hasMore && <Button variant="outline" disabled={loadingMore} onClick={() => history.error ? void history.refresh() : setOffset(history.data!.offset + 20)}>{loadingMore ? "Carregando…" : "Carregar campanhas anteriores"}</Button>}
    {!!localEntries.length && <details className="rounded-2xl border bg-card p-5"><summary className="cursor-pointer text-sm font-semibold">Registros antigos deste navegador ({localEntries.length})</summary><p className="my-4 text-xs leading-5 text-muted-foreground">Cópias preservadas do histórico anterior. Algumas campanhas também podem aparecer acima. Estes registros mostram o resultado original; entrega e leitura atualizadas estão no histórico do servidor.</p><div className="space-y-4">{localEntries.map(entry => <CampaignCard key={entry.id} entry={{ ...entry, visibleContacts: entry.contacts }} />)}</div></details>}
  </div>;
}

function CampaignCard({ entry, open = false }: { entry: DispatchHistoryEntry & { visibleContacts: DispatchHistoryEntry["contacts"] }; open?: boolean }) {
  const delivered = entry.contacts.filter(contact => contact.status === "delivered" || contact.status === "read").length;
  const read = entry.contacts.filter(contact => contact.status === "read").length;
  const failed = entry.contacts.filter(contact => contact.status === "failed").length;
  return <details open={open} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden"><div><h3 className="break-words text-sm font-semibold">{entry.title}{entry.isTest ? " · Teste individual" : ""}</h3><p className="mt-1 text-xs text-muted-foreground">{dateLabel(entry.createdAt)} · {entry.mode === "text" ? "Mensagem escrita" : "Mensagem aprovada pelo WhatsApp"}</p><p className="mt-1 text-xs text-muted-foreground">Enviada por {entry.sender}</p></div><span className="flex items-center gap-3 text-xs">{entry.total} destinatários<ChevronDown className="h-4 w-4" /></span></summary>
    <div className="space-y-4 px-5 pb-5">
      {entry.message && <div className="rounded-xl border bg-muted/20 p-4"><p className="mb-2 text-xs font-semibold">Mensagem da campanha</p><p className="whitespace-pre-wrap break-words text-sm">{entry.message.replace(/^Template Meta:/, "Mensagem aprovada:")}</p></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: "Destinatários", value: entry.total }, { label: "Entregues", value: delivered }, { label: "Lidas", value: read }, { label: "Com falha", value: entry.missingContacts ? Math.max(entry.failed, failed) : failed }].map(item => <div key={item.label} className="rounded-xl border bg-muted/20 px-4 py-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p></div>)}</div>
      {entry.missingContacts > 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950 dark:text-amber-100">Este registro antigo contém o resumo, mas não os detalhes de {entry.missingContacts} destinatário(s). Os motivos das falhas não foram salvos naquela época. Confira também as cópias antigas deste navegador.</p>}
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-muted/50"><tr>{["Destinatário", "Resultado", "WhatsApp no número", "Datas e horários", "O que aconteceu"].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y">{entry.visibleContacts.map((contact, index) => <tr key={`${contact.phone}-${index}`} className="align-top hover:bg-muted/20">
        <td className="whitespace-nowrap px-4 py-4 font-medium">+{contact.phone}</td>
        <td className="px-4 py-4"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${statuses[contact.status].color}`}>{statuses[contact.status].label}</span></td>
        <td className="px-4 py-4"><p className="font-medium">{contact.whatsapp === "confirmed" ? "Confirmado" : "Não foi possível confirmar"}</p><p className="mt-1 leading-5 text-muted-foreground">{contact.whatsapp === "confirmed" ? "Houve entrega, leitura ou resposta deste número." : "O pedido de envio ou uma falha, por si só, não confirma se o número usa WhatsApp."}</p></td>
        <td className="min-w-52 px-4 py-4"><div className="space-y-1">{[
          ["Tentativa", contact.attemptedAt], ["Resultado inicial", contact.processedAt], ["Enviada", contact.sentAt],
          ["Entregue", contact.deliveredAt], ["Lida", contact.readAt], ["Falhou", contact.failedAt],
        ].filter(([, at]) => at).map(([label, at]) => <p key={label} className="whitespace-nowrap"><span className="font-medium">{label}: </span>{dateLabel(at!)}</p>)}{!contact.attemptedAt && <p>Registro da campanha: {dateLabel(entry.createdAt)}</p>}</div></td>
        <td className="min-w-64 max-w-md break-words px-4 py-4 leading-5 text-muted-foreground">{contact.detail}</td>
      </tr>)}</tbody></table></div><p className="text-xs text-muted-foreground">{entry.visibleContacts.length} destinatários exibidos</p>
    </div>
  </details>;
}
