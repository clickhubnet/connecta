"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, FileText, Filter, MessageCircleMore, Mic, Paperclip, Search, Send, Square, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useApiResource } from "@/hooks/use-api-resource";
import { useCurrentUser } from "@/hooks/use-current-user";

type Message = { id: string; direction: string; body: string; createdAt: string };
type Thread = { id: string; phone: string; state: string; ownerUserId: string | null; lead: { name: string } | null; owner: { name: string } | null; messages: Message[] };
type InboxData = { conversations: Thread[]; employees: Array<{ id: string; name: string }> };
type MediaBody = { kind: "media"; mediaKind: "image" | "video" | "audio" | "document"; fileName: string; mimeType: string; dataUrl: string; caption?: string };

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
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const inbox = useApiResource<InboxData>(`/api/envio-em-massa/conversas?filter=${filter}&search=${encodeURIComponent(search)}`);
  const detail = useApiResource<InboxData>(`/api/envio-em-massa/conversas?id=${selectedId ?? ""}`, Boolean(selectedId));
  const thread = selectedId && !detail.loading && !detail.error ? detail.data?.conversations.find((item) => item.id === selectedId) ?? null : null;
  const freeFormWindowOpen = hasOpenCustomerServiceWindow(thread);

  useEffect(() => {
    const timer = window.setInterval(() => { void inbox.refresh(); if (selectedId) void detail.refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [inbox.refresh, detail.refresh, selectedId]);

  async function assign(ownerUserId: string) {
    if (!selectedId) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/envio-em-massa/conversas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selectedId, ownerUserId: ownerUserId || null }) });
      if (!response.ok) throw new Error("Não foi possível atribuir o funcionário.");
      await Promise.all([inbox.refresh(), detail.refresh()]);
      setNotice("Responsável atualizado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao atribuir.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBlocked() {
    if (!thread || saving) return;
    const willBlock = thread.state !== "BLOCKED";
    if (willBlock && !window.confirm("Bloquear este contato nos disparos?")) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/envio-em-massa/conversas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: thread.id, action: willBlock ? "block" : "unblock" }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Não foi possível atualizar o contato.");
      await Promise.all([inbox.refresh(), detail.refresh()]);
      setNotice(willBlock ? "Contato bloqueado." : "Contato desbloqueado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao atualizar contato.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteConversation() {
    if (!thread || saving) return;
    if (!window.confirm("Excluir esta conversa dos disparos?")) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/envio-em-massa/conversas?id=${thread.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Não foi possível excluir a conversa.");
      setSelectedId(null);
      await inbox.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao excluir conversa.");
    } finally {
      setSaving(false);
    }
  }

  async function sendCurrentMessage() {
    if (!selectedId || thread?.state === "BLOCKED" || !freeFormWindowOpen || isSending || (!message.trim() && !selectedFile)) return;
    setIsSending(true);
    setNotice("");
    try {
      const response = selectedFile ? await sendMedia() : await fetch("/api/envio-em-massa/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, content: message.trim() }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Não foi possível enviar.");
      setMessage("");
      clearSelectedMedia();
      await Promise.all([inbox.refresh(), detail.refresh()]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setIsSending(false);
    }
  }

  async function sendMedia() {
    const formData = new FormData();
    formData.append("conversationId", selectedId!);
    formData.append("caption", message);
    if (selectedFile) formData.append("file", selectedFile);
    return fetch("/api/envio-em-massa/conversas", { method: "POST", body: formData });
  }

  async function startRecording() {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: recorder.mimeType || "audio/webm" });
        setSelectedFile(file);
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      });
      recorder.start();
      setIsRecording(true);
    } catch {
      setNotice("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }

  function clearSelectedMedia() {
    setSelectedFile(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
            {inbox.loading ? <p className="p-6 text-xs text-muted-foreground">Carregando…</p> : inbox.data?.conversations.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setNotice(""); }} className={`w-full border-b p-4 text-left hover:bg-muted/40 ${selectedId === item.id ? "bg-primary/5" : ""}`}><div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-sm font-semibold">{item.lead?.name ?? item.phone}</p>{item.state === "BLOCKED" ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-700">Bloqueado</span> : null}</div><p className="mt-1 truncate text-xs text-muted-foreground">{messagePreview(item.messages[0]?.body) ?? "Sem mensagens"}</p><p className="mt-2 text-[10px] text-primary">{item.owner?.name ?? "Sem responsável"}</p></button>)}
            {!inbox.loading && !inbox.error && !inbox.data?.conversations.length && <div className="p-6 text-center"><MessageCircleMore aria-hidden="true" className="mx-auto mb-3 mt-8 h-8 w-8 text-muted-foreground/50" /><p role="status" className="text-sm font-medium">{search.trim() ? "Nenhuma conversa encontrada." : selected.empty}</p></div>}
          </div>
          <div className="shrink-0 border-t p-4"><Button asChild variant="outline" className="w-full rounded-xl"><Link href="/envio-em-massa"><Send className="h-4 w-4" />Ir para disparos</Link></Button></div>
        </section>
        <section aria-label="Mensagens da conversa" className="wa-chat-panel">
          {selectedId ? <>
            <div className="shrink-0 border-b bg-card p-4">
              <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="ghost" size="icon" className="lg:hidden" aria-label="Voltar às conversas" onClick={() => setSelectedId(null)}><ArrowLeft className="h-4 w-4" /></Button><p className="min-w-0 flex-1 truncate text-sm font-semibold">{thread?.lead?.name ?? thread?.phone ?? "Conversa"}</p>{thread?.state === "BLOCKED" ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-semibold text-rose-700">Bloqueado</span> : null}
              {user?.role === "ADMIN" && thread ? <label className="flex items-center gap-2 text-xs">Funcionário<select aria-label="Atribuir funcionário" disabled={saving} value={thread.ownerUserId ?? ""} onChange={(event) => void assign(event.target.value)} className="h-10 max-w-52 rounded-xl border bg-card px-3"><option value="">Sem responsável</option>{detail.data?.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label> : thread && <span className="text-xs text-muted-foreground">{thread.owner?.name}</span>}
              {thread ? <div className="flex items-center gap-1"><Button type="button" variant="outline" size="sm" disabled={saving} className="h-9 rounded-xl text-xs" onClick={() => void toggleBlocked()}>{thread.state === "BLOCKED" ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{thread.state === "BLOCKED" ? "Desbloquear" : "Bloquear"}</Button><Button type="button" variant="outline" size="sm" disabled={saving} className="h-9 rounded-xl text-xs text-destructive hover:text-destructive" onClick={() => void deleteConversation()}><Trash2 className="h-4 w-4" />Excluir</Button></div> : null}</div>
              {notice && <p role="status" className="mt-2 text-xs text-destructive">{notice}</p>}
            </div>
            <div className="wa-messages min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {detail.error && <p role="alert" className="rounded-xl bg-card p-4 text-sm text-destructive">{detail.error}</p>}
              {detail.loading ? <p className="text-sm text-muted-foreground">Carregando mensagens…</p> : thread && [...thread.messages].reverse().map((item) => <div key={item.id} className={`flex ${item.direction === "inbound" ? "justify-start" : "justify-end"}`}><MessageBubble message={item} /></div>)}
            </div>
            {selectedFile ? (
              <div className="mx-4 mb-2 rounded-2xl border bg-muted/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-medium">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{Math.ceil(selectedFile.size / 1024)} KB</p></div>
                  <Button type="button" variant="ghost" size="icon" onClick={clearSelectedMedia}><X className="h-4 w-4" /></Button>
                </div>
                {audioPreviewUrl ? <audio className="mt-3 w-full" controls src={audioPreviewUrl} /> : null}
              </div>
            ) : null}
            <input ref={fileInputRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file) { setSelectedFile(file); if (!file.type.startsWith("audio/") && audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); } } }} />
            {!thread ? <div className="shrink-0 border-t bg-card px-4 py-3 text-sm text-muted-foreground">Carregando conversa…</div> : thread.state === "BLOCKED" ? <div className="shrink-0 border-t bg-rose-50 px-4 py-3 text-sm text-rose-700">Contato bloqueado. Desbloqueie para enviar novas mensagens.</div> : !freeFormWindowOpen ? <div className="shrink-0 border-t bg-amber-50 px-4 py-3 text-sm text-amber-800">Mensagem livre bloqueada pela Meta até o cliente responder. Envie um template aprovado em Disparos ou aguarde a resposta para abrir a janela de 24 horas.</div> : <div className="shrink-0 border-t bg-card px-4 py-3">
              <div className="flex items-end gap-2">
                <Button type="button" variant="ghost" size="icon" aria-label="Anexar mídia ou documento" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={isRecording ? "Parar gravação" : "Gravar áudio"} onClick={isRecording ? stopRecording : () => void startRecording()}>{isRecording ? <Square className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}</Button>
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={selectedFile ? "Legenda opcional..." : "Digite uma mensagem..."} rows={1} className="min-h-11 max-h-28 flex-1 resize-y rounded-2xl bg-muted/40 py-3" />
                <Button type="button" size="icon" className="h-11 w-11 rounded-full" aria-label="Enviar mensagem" disabled={isSending || (!message.trim() && !selectedFile)} onClick={() => void sendCurrentMessage()}><Send className="h-4 w-4" /></Button>
              </div>
            </div>}
          </> : <div className="wa-messages flex h-full items-center justify-center p-8 text-center"><div className="max-w-sm"><MessageCircleMore aria-hidden="true" className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-5 text-lg font-semibold">Selecione uma conversa.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{user?.role === "ADMIN" ? "Acompanhe as respostas dos disparos e atribua cada conversa a um funcionário." : "Aqui aparecem apenas as conversas de campanha atribuídas a você."}</p></div></div>}
        </section>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const media = parseMediaBody(message.body);
  const outbound = message.direction === "outbound";
  return (
    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${outbound ? "bg-[#d9fdd3] text-neutral-900 dark:bg-[#164b42] dark:text-white" : "bg-card text-foreground"}`}>
      {media ? <MediaMessage media={media} /> : <p className="whitespace-pre-wrap break-words">{message.body}</p>}
      <p className="mt-1 text-right text-[10px] opacity-60">{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
    </div>
  );
}

function MediaMessage({ media }: { media: MediaBody }) {
  if (media.mediaKind === "image") return <div className="space-y-2"><a href={media.dataUrl} target="_blank" rel="noreferrer"><img src={media.dataUrl} alt={media.caption || media.fileName} className="max-h-72 rounded-xl object-contain" /></a>{media.caption ? <p className="whitespace-pre-wrap break-words">{media.caption}</p> : null}</div>;
  if (media.mediaKind === "audio") return <div className="min-w-56 space-y-2"><div className="flex items-center gap-2 text-xs font-medium"><Mic className="h-4 w-4" />Áudio</div><audio controls src={media.dataUrl} className="w-full" /></div>;
  if (media.mediaKind === "video") return <div className="space-y-2"><video controls src={media.dataUrl} className="max-h-72 rounded-xl" />{media.caption ? <p className="whitespace-pre-wrap break-words">{media.caption}</p> : null}</div>;
  return <a href={media.dataUrl} target="_blank" rel="noreferrer" download={media.fileName} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/70 p-3 text-neutral-900"><FileText className="h-5 w-5" /><span className="min-w-0"><span className="block truncate font-medium">{media.fileName}</span><span className="text-xs opacity-70">Abrir documento</span></span></a>;
}

function parseMediaBody(body?: string | null): MediaBody | null {
  if (!body?.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(body) as Partial<MediaBody>;
    if (parsed.kind === "media" && parsed.mediaKind && parsed.dataUrl && parsed.fileName && parsed.mimeType) return parsed as MediaBody;
  } catch {
    return null;
  }
  return null;
}

function messagePreview(body?: string | null) {
  const media = parseMediaBody(body);
  if (!media) return body ?? null;
  if (media.mediaKind === "image") return `Imagem${media.caption ? `: ${media.caption}` : ""}`;
  if (media.mediaKind === "audio") return "Áudio";
  if (media.mediaKind === "video") return `Vídeo${media.caption ? `: ${media.caption}` : ""}`;
  return `Documento: ${media.fileName}`;
}

function hasOpenCustomerServiceWindow(thread: Thread | null) {
  if (!thread) return false;
  const windowStart = Date.now() - 24 * 60 * 60 * 1000;
  return thread.messages.some((message) => message.direction === "inbound" && new Date(message.createdAt).getTime() >= windowStart);
}
