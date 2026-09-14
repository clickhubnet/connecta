"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Megaphone, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";

type TemplateOption = {
  id: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components: Array<{ type: string; format?: string; text?: string }>;
  unsupportedReason: string | null;
  headerVariables: string[];
  bodyVariables: string[];
  hasMediaHeader: boolean;
  previewText: string;
};

type DispatchResult = {
  total: number;
  accepted: number;
  failed: number;
  uncertain: number;
  contacts: Array<{
    phone: string;
    status: "accepted" | "failed" | "uncertain";
    detail: string;
    providerMessageId?: string;
  }>;
};

const LAST_MASS_MESSAGE_RESULT_KEY = "connecta:meta:last-mass-message-result";

export function MassMessagePanel() {
  const [contacts, setContacts] = useState("");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [headerValues, setHeaderValues] = useState<string[]>([]);
  const [bodyValues, setBodyValues] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [maxBatchContacts, setMaxBatchContacts] = useState(100);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DispatchResult | null>(null);
  const sendingRef = useRef(false);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates],
  );

  const compatibleTemplates = useMemo(() => templates.filter((template) => !template.unsupportedReason), [templates]);

  const estimatedContacts = useMemo(() => {
    const unique = new Set(
      contacts
        .split(/\r?\n|;|,/)
        .map((item) => item.replace(/\D/g, ""))
        .filter((item) => item.length >= 10),
    );

    return unique.size;
  }, [contacts]);

  const preview = useMemo(() => {
    if (!selectedTemplate) return "";
    return selectedTemplate.previewText.replace(/\{\{([^{}]+)\}\}/g, (_match, rawIndex: string) => {
      const index = Number(rawIndex.trim()) - 1;
      return bodyValues[index]?.trim() || `{{${rawIndex}}}`;
    });
  }, [bodyValues, selectedTemplate]);

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_MASS_MESSAGE_RESULT_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as DispatchResult;
      if (
        typeof parsed?.total === "number" &&
        typeof parsed?.accepted === "number" &&
        typeof parsed?.failed === "number" &&
        typeof parsed?.uncertain === "number" &&
        Array.isArray(parsed?.contacts)
      ) {
        setResult(parsed);
      }
    } catch {
      window.localStorage.removeItem(LAST_MASS_MESSAGE_RESULT_KEY);
    }
  }, []);

  useEffect(() => {
    setHeaderValues(Array.from({ length: selectedTemplate?.headerVariables.length ?? 0 }, () => ""));
    setBodyValues(Array.from({ length: selectedTemplate?.bodyVariables.length ?? 0 }, () => ""));
    setMediaUrl("");
  }, [selectedTemplateId, selectedTemplate?.bodyVariables.length, selectedTemplate?.headerVariables.length]);

  async function loadTemplates() {
    setIsLoadingTemplates(true);
    setError(null);

    try {
      const response = await fetch("/api/envio-em-massa", { method: "GET" });
      const payload = (await response.json()) as {
        status: "success" | "error";
        message: string;
        data?: { templates: TemplateOption[]; maxBatchContacts: number };
      };

      if (!response.ok || payload.status !== "success" || !payload.data) {
        throw new Error(payload.message || "Não foi possível carregar os templates.");
      }

      setTemplates(payload.data.templates);
      setMaxBatchContacts(payload.data.maxBatchContacts);
      const firstCompatible = payload.data.templates.find((template) => !template.unsupportedReason);
      setSelectedTemplateId((current) => current || firstCompatible?.id || payload.data?.templates[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar os templates da Meta.");
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/envio-em-massa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactsText: contacts,
          templateId: selectedTemplateId,
          headerValues,
          bodyValues,
          mediaUrl,
          consentConfirmed,
        }),
      });
      const payload = (await response.json()) as {
        status: "success" | "error";
        message: string;
        data?: DispatchResult;
      };

      if (!response.ok || payload.status !== "success" || !payload.data) {
        throw new Error(payload.message || "Não foi possível concluir o envio.");
      }

      setResult(payload.data);
      window.localStorage.setItem(LAST_MASS_MESSAGE_RESULT_KEY, JSON.stringify(payload.data));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha no envio em massa.");
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  }

  const submitDisabled =
    isSending ||
    isLoadingTemplates ||
    !selectedTemplate ||
    Boolean(selectedTemplate.unsupportedReason) ||
    !contacts.trim() ||
    !consentConfirmed;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-emerald-500/10 p-3 text-emerald-600">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Disparo em massa pela Meta</CardTitle>
              <CardDescription>
                Envie campanhas com templates aprovados no WhatsApp Business Manager.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <fieldset className="space-y-5" disabled={isSending}>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Contatos</p>
                <Textarea
                  value={contacts}
                  onChange={(event) => setContacts(event.target.value)}
                  placeholder={"Cole um número por linha\n5511999999999\n5511988887777"}
                  className="min-h-44"
                />
                <p className="text-xs text-muted-foreground">
                  Separe por linha, vírgula ou ponto e vírgula. Detectados: <strong>{estimatedContacts}</strong> de {maxBatchContacts}.
                </p>
              </div>

              <div className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Template aprovado</p>
                  <Button type="button" variant="outline" size="sm" onClick={loadTemplates} disabled={isLoadingTemplates}>
                    {isLoadingTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Atualizar
                  </Button>
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isLoadingTemplates ? <option value="">Carregando templates...</option> : null}
                  {!isLoadingTemplates && !templates.length ? <option value="">Nenhum template aprovado encontrado</option> : null}
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.language}){template.unsupportedReason ? " - indisponível" : ""}
                    </option>
                  ))}
                </select>
                {selectedTemplate?.unsupportedReason ? (
                  <p className="text-xs text-rose-600">{selectedTemplate.unsupportedReason}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Templates compatíveis nesta etapa: <strong>{compatibleTemplates.length}</strong>
                  </p>
                )}
              </div>

              {selectedTemplate?.hasMediaHeader ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">URL pública da mídia</p>
                  <Input
                    value={mediaUrl}
                    onChange={(event) => setMediaUrl(event.target.value)}
                    placeholder="https://seudominio.com/arquivo.jpg"
                  />
                </div>
              ) : null}

              {selectedTemplate?.headerVariables.length ? (
                <VariableFields
                  label="Variáveis do cabeçalho"
                  variables={selectedTemplate.headerVariables}
                  values={headerValues}
                  onChange={setHeaderValues}
                />
              ) : null}

              {selectedTemplate?.bodyVariables.length ? (
                <VariableFields
                  label="Variáveis do corpo"
                  variables={selectedTemplate.bodyVariables}
                  values={bodyValues}
                  onChange={setBodyValues}
                />
              ) : null}

              {selectedTemplate ? (
                <div className="grid gap-2 rounded-md border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Prévia do corpo</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {preview || "Este template não possui texto de prévia."}
                  </p>
                </div>
              ) : null}

              <label className="flex items-start gap-3 rounded-md border p-4 text-sm">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(event) => setConsentConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-muted-foreground">
                  Confirmo que os contatos desta lista autorizaram receber mensagens desta empresa pelo WhatsApp.
                </span>
              </label>
            </fieldset>

            {error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={submitDisabled}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSending ? "Enviando..." : "Disparar campanha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Regras desta etapa</CardTitle>
            <CardDescription>O disparo usa a Cloud API oficial da Meta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Apenas templates aprovados ficam disponíveis para envio.</p>
            <p>2. As variáveis valem para todos os contatos do lote.</p>
            <p>3. Mídia precisa estar em URL HTTPS pública quando o template exigir.</p>
            <p>4. A tela mostra aceite da API; confirmação de entrega depende dos webhooks.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado do último envio</CardTitle>
            <CardDescription>Resumo rápido do lote processado.</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <ResultMetric label="Total" value={String(result.total)} tone="slate" />
                  <ResultMetric label="Aceitas" value={String(result.accepted)} tone="emerald" />
                  <ResultMetric label="Incerto" value={String(result.uncertain)} tone="amber" />
                  <ResultMetric label="Falhas" value={String(result.failed)} tone="rose" />
                </div>

                <div className="space-y-2">
                  {result.contacts.map((contact) => (
                    <div key={`${contact.phone}-${contact.providerMessageId ?? contact.status}`} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                      <div>
                        <p className="font-medium">{contact.phone}</p>
                        <p className="text-xs text-muted-foreground">{contact.detail}</p>
                        {contact.providerMessageId ? <p className="text-xs text-muted-foreground">ID Meta: {contact.providerMessageId}</p> : null}
                      </div>
                      <StatusPill status={contact.status} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Faça um disparo para ver o resumo de aceite, falha e status incerto.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VariableFields({
  label,
  variables,
  values,
  onChange,
}: {
  label: string;
  variables: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {variables.map((variable, index) => (
          <div key={variable} className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">{`{{${variable}}}`}</p>
            <Input
              value={values[index] ?? ""}
              onChange={(event) => {
                const nextValues = [...values];
                nextValues[index] = event.target.value;
                onChange(nextValues);
              }}
              placeholder={`Valor para {{${variable}}}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: DispatchResult["contacts"][number]["status"] }) {
  const config = {
    accepted: { label: "Aceita", className: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
    uncertain: { label: "Incerto", className: "bg-amber-500/10 text-amber-700", icon: TriangleAlert },
    failed: { label: "Falhou", className: "bg-rose-500/10 text-rose-700", icon: TriangleAlert },
  }[status];
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function ResultMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-500/10 text-amber-700"
        : tone === "rose"
          ? "bg-rose-500/10 text-rose-700"
          : "bg-slate-500/10 text-slate-700";

  return (
    <div className={cn("rounded-md border px-3 py-3", toneClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
