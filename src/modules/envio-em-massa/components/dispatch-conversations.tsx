"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Filter, MessageCircleMore, Search, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useApiResource } from "@/hooks/use-api-resource";
import { useCurrentUser } from "@/hooks/use-current-user";

type Thread = { id: string; phone: string; ownerUserId: string | null; lead: { name: string } | null; owner: { name: string } | null; messages: Array<{ id: string; direction: string; body: string; createdAt: string }> };
type InboxData = { conversations: Thread[]; employees: Array<{ id: string; name: string }> };

const filters = [
  { id: "all", label: "Todas", empty: "Nenhuma conversa de disparo disponível." },
  { id: "unread", label: "Não Lidas", empty: "Nenhuma conversa não lida disponível." },
  { id: "unanswered", label: "Não respondidas", empty: "Nenhuma conversa aguardando resposta disponível." },
  { id: "open", label: "Abertas", empty: "Nenhuma conversa aberta disponível." },
  { id: "blocked", label: "Bloqueadas", empty: "Nenhuma conversa bloqueada disponível." },
] as const;

export function DispatchConversations() {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const inbox = useApiResource<InboxData>(`/api/envio-em-massa/conversas?filter=${filter}&search=${encodeURIComponent(search)}`);
  const detail = useApiResource<InboxData>(`/api/envio-em-massa/conversas?id=${selectedId ?? ""}`, Boolean(selectedId));
  const thread = selectedId && !detail.loading && !detail.error ? detail.data?.conversations.find((item) => item.id === selectedId) : null;
  useEffect(() => {
    const timer = window.setInterval(() => { void inbox.refresh(); if (selectedId) void detail.refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [inbox.refresh, detail.refresh, selectedId]);
  async function assign(ownerUserId: string) {
    if (!selectedId) return;
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/envio-em-massa/conversas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selectedId, ownerUserId: ownerUserId || null }) });
      if (!response.ok) throw new Error("Não foi possível atribuir o funcionário.");
      await Promise.all([inbox.refresh(), detail.refresh()]);
      setNotice("Responsável atualizado.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha ao atribuir."); }
    finally { setSaving(false); }
  }
  const selected = filters.find((item) => item.id === filter)!;

  return (
    <div className="wa-inbox" data-mobile-chat={Boolean(selectedId)}>
      <div className="wa-columns bg-card">
        <section aria-label="Conversas de disparos" className="wa-list-panel bg-card">
          <div className="shrink-0 border-b p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div><p className="text-xs font-semibold">Caixa de entrada</p><p className="mt-1 text-xs text-muted-foreground">{selected.label}</p></div>
              <Button type="button" variant="ghost" className="h-8 rounded-lg px-2 text-xs" aria-expanded={filtersOpen} aria-controls="dispatch-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Filter className="h-4 w-4" />Filtros</Button>
            </div>
            {filtersOpen && <div id="dispatch-filters" role="group" aria-label="Filtrar conversas" className="mb-4 flex flex-wrap gap-2">{filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-3 py-2 text-xs font-medium transition-colors ${filter === item.id ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}</div>}
            <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar conversas dos disparos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar contato ou número" className="h-11 rounded-xl border-transparent bg-muted/60 pl-9 text-xs" /></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {inbox.error && <p role="alert" className="p-4 text-sm text-destructive">{inbox.error}</p>}
            {inbox.loading ? <p className="p-6 text-xs text-muted-foreground">Carregando…</p> : inbox.data?.conversations.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setNotice(""); }} className={`w-full border-b p-4 text-left hover:bg-muted/40 ${selectedId === item.id ? "bg-primary/5" : ""}`}><p className="text-sm font-semibold">{item.lead?.name ?? item.phone}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.messages[0]?.body ?? "Sem mensagens"}</p><p className="mt-2 text-[10px] text-primary">{item.owner?.name ?? "Sem responsável"}</p></button>)}
            {!inbox.loading && !inbox.error && !inbox.data?.conversations.length && <div className="p-6 text-center"><MessageCircleMore aria-hidden="true" className="mx-auto mb-3 mt-8 h-8 w-8 text-muted-foreground/50" /><p role="status" className="text-sm font-medium">{search.trim() ? "Nenhuma conversa encontrada." : selected.empty}</p></div>}
          </div>
          <div className="shrink-0 border-t p-4"><Button asChild variant="outline" className="w-full rounded-xl"><Link href="/envio-em-massa"><Send className="h-4 w-4" />Ir para disparos</Link></Button></div>
        </section>
        <section aria-label="Mensagens da conversa" className="wa-chat-panel">
          {selectedId ? <>
            <div className="shrink-0 border-b bg-card p-4">
              <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Voltar às conversas" onClick={() => setSelectedId(null)}><ArrowLeft className="h-4 w-4" /></Button><p className="flex-1 text-sm font-semibold">{thread?.lead?.name ?? thread?.phone ?? "Conversa"}</p>
              {user?.role === "ADMIN" && thread ? <label className="flex items-center gap-2 text-xs">Funcionário<select aria-label="Atribuir funcionário" disabled={saving} value={thread.ownerUserId ?? ""} onChange={(event) => void assign(event.target.value)} className="h-10 max-w-52 rounded-xl border bg-card px-3"><option value="">Sem responsável</option>{detail.data?.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label> : thread && <span className="text-xs text-muted-foreground">{thread.owner?.name}</span>}</div>
              {notice && <p role="status" className="mt-2 text-xs">{notice}</p>}
            </div>
            <div className="wa-messages min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {detail.error && <p role="alert" className="rounded-xl bg-card p-4 text-sm text-destructive">{detail.error}</p>}
              {detail.loading ? <p className="text-sm text-muted-foreground">Carregando mensagens…</p> : thread && [...thread.messages].reverse().map((message) => <div key={message.id} className={`flex ${message.direction === "inbound" ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.direction === "inbound" ? "bg-card text-foreground" : "bg-[#d9fdd3] text-neutral-900 dark:bg-[#164b42] dark:text-white"}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className="mt-1 text-right text-[10px] opacity-60">{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div></div>)}
            </div>
          </> : <div className="wa-messages flex h-full items-center justify-center p-8 text-center"><div className="max-w-sm"><MessageCircleMore aria-hidden="true" className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-5 text-lg font-semibold">Selecione uma conversa.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{user?.role === "ADMIN" ? "Acompanhe os atendimentos e atribua cada conversa a um funcionário." : "Aqui aparecem apenas as conversas atribuídas a você."}</p></div></div>}

        </section>
      </div>
    </div>
  );
}
