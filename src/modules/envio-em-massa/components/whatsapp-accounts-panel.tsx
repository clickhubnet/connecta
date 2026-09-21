"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, HTMLAttributes } from "react";
import { CheckCircle2, Clipboard, Eye, EyeOff, Save, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/utils/cn";

type WhatsappAccount = {
  id: string;
  name: string;
  phone: string;
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  apiVersion: string;
  accessToken: string;
  createdAt: string;
};

type AccountForm = Omit<WhatsappAccount, "id" | "createdAt">;

const emptyForm: AccountForm = {
  name: "",
  phone: "",
  phoneNumberId: "",
  wabaId: "",
  verifyToken: "",
  apiVersion: "v21.0",
  accessToken: "",
};

function storageKey(userId?: string) {
  return `connecta:meta-accounts:${userId ?? "guest"}`;
}

export function WhatsappAccountsPanel() {
  const { data: user } = useCurrentUser();
  const [accounts, setAccounts] = useState<WhatsappAccount[]>([]);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = useMemo(() => storageKey(user?.id), [user?.id]);
  const webhookUrl = useMemo(() => {
    if (typeof window === "undefined") return "/api/webhooks/meta";
    return `${window.location.origin}/api/webhooks/meta`;
  }, []);

  useEffect(() => {
    setReady(false);
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setAccounts([]);
        return;
      }

      const parsed = JSON.parse(stored) as WhatsappAccount[];
      setAccounts(Array.isArray(parsed) ? parsed.filter(isAccount) : []);
    } catch {
      window.localStorage.removeItem(key);
      setAccounts([]);
    } finally {
      setLoadedKey(key);
      setReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (!ready || loadedKey !== key) return;
    window.localStorage.setItem(key, JSON.stringify(accounts));
  }, [accounts, key, loadedKey, ready]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeForm(form);
    if (!normalized) return;

    if (editingId) {
      setAccounts((current) => current.map((account) => (account.id === editingId ? { ...account, ...normalized } : account)));
    } else {
      setAccounts((current) => [
        {
          ...normalized,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowToken(false);
  }

  function editAccount(account: WhatsappAccount) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      phone: account.phone,
      phoneNumberId: account.phoneNumberId,
      wabaId: account.wabaId,
      verifyToken: account.verifyToken,
      apiVersion: account.apiVersion,
      accessToken: account.accessToken,
    });
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="accounts-layout">
      <Card className="accounts-card overview-card overview-red relative isolate min-w-0 overflow-hidden rounded-2xl border-border/70 bg-card">
        <div className="accounts-card-head flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">Contas configuradas</h2>
              <p className="mt-1 text-xs text-muted-foreground">{accounts.length} conta{accounts.length === 1 ? "" : "s"} pronta{accounts.length === 1 ? "" : "s"} para conexão com a Meta.</p>
            </div>
          </div>
        </div>

        <div className="accounts-list space-y-3 p-4 sm:p-5">
          {accounts.length ? (
            accounts.map((account) => (
              <article key={account.id} className={cn("rounded-xl border bg-background/80 p-3.5 transition-colors hover:border-primary/35", editingId === account.id && "border-primary/50 bg-primary/5")}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <button type="button" onClick={() => editAccount(account)} className="min-w-0 flex-1 text-left">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold">{account.name}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ativa
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{account.phone}</p>
                    <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <AccountDetail label="Phone Number ID" value={account.phoneNumberId} />
                      <AccountDetail label="WABA ID" value={account.wabaId} />
                      <AccountDetail label="API" value={account.apiVersion} />
                      <AccountDetail label="Token" value={maskToken(account.accessToken)} />
                    </dl>
                  </button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Excluir conta" onClick={() => setAccounts((current) => current.filter((item) => item.id !== account.id))} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="grid h-full min-h-64 place-items-center rounded-xl border border-dashed bg-background/50 p-6 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Smartphone className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold">Nenhuma conta cadastrada</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Cadastre a conta WhatsApp Cloud API para revisar os dados que serão usados nos disparos.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="accounts-aside">
        <Card className="accounts-form-card overview-card overview-red relative isolate min-w-0 overflow-hidden rounded-2xl border-border/70 bg-card">
          <div className="mb-0 flex items-center gap-3 border-b border-border/60 p-4 sm:p-5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Save className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold">{editingId ? "Editar conta WhatsApp" : "Nova conta WhatsApp"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Dados da conta oficial da Meta.</p>
            </div>
          </div>

          <form className="accounts-form space-y-3 p-4 sm:p-5" onSubmit={handleSubmit}>
            <InputField label="Nome da conta" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Envios Connecta" />
            <InputField label="Telefone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="5511999999999" inputMode="tel" />
            <InputField label="Phone Number ID" value={form.phoneNumberId} onChange={(value) => setForm((current) => ({ ...current, phoneNumberId: value }))} placeholder="11921061066" />
            <InputField label="WABA ID" value={form.wabaId} onChange={(value) => setForm((current) => ({ ...current, wabaId: value }))} placeholder="2217118402423756" />
            <InputField label="Verify Token" value={form.verifyToken} onChange={(value) => setForm((current) => ({ ...current, verifyToken: value }))} placeholder="Token de verificação" />
            <InputField label="Versão da API" value={form.apiVersion} onChange={(value) => setForm((current) => ({ ...current, apiVersion: value }))} placeholder="v21.0" />

            <label className="block space-y-2">
              <span className="text-xs font-semibold">Access Token</span>
              <div className="relative">
                <Textarea
                  required
                  value={form.accessToken}
                  onChange={(event) => setForm((current) => ({ ...current, accessToken: event.target.value }))}
                  placeholder="Cole o access token da Meta"
                  className="accounts-token min-h-20 resize-none rounded-xl bg-muted/20 pr-12"
                  rows={4}
                  spellCheck={false}
                  autoComplete="off"
                  style={{ WebkitTextSecurity: showToken ? "none" : "disc" } as CSSProperties & { WebkitTextSecurity?: string }}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={showToken ? "Ocultar token" : "Mostrar token"} onClick={() => setShowToken((current) => !current)} className="absolute right-2 top-2 h-8 w-8">
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </label>

            <Button type="submit" className="h-11 w-full rounded-xl">
              <Save className="h-4 w-4" />
              {editingId ? "Salvar alterações" : "Salvar conta"}
            </Button>
          </form>
        </Card>

        <Card className="accounts-webhook min-w-0 overflow-hidden rounded-2xl border-border/70 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold">Webhook para Meta</h3>
              <p className="mt-1 break-all rounded-xl border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">{webhookUrl}</p>
            </div>
            <Button type="button" variant="outline" size="icon" aria-label="Copiar webhook" onClick={() => void copyWebhook()} className="shrink-0">
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-3 text-xs font-medium text-muted-foreground">{copied ? "Webhook copiado." : "Use o Verify Token cadastrado na conta escolhida."}</p>
        </Card>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold">{label}</span>
      <Input required value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="h-11 rounded-xl bg-muted/20" />
    </label>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function normalizeForm(form: AccountForm): AccountForm | null {
  const normalized = {
    name: form.name.trim(),
    phone: form.phone.replace(/\D/g, ""),
    phoneNumberId: form.phoneNumberId.trim(),
    wabaId: form.wabaId.trim(),
    verifyToken: form.verifyToken.trim(),
    apiVersion: form.apiVersion.trim() || "v21.0",
    accessToken: form.accessToken.trim(),
  };

  return Object.values(normalized).every(Boolean) ? normalized : null;
}

function isAccount(value: unknown): value is WhatsappAccount {
  if (!value || typeof value !== "object") return false;
  const candidate = value as WhatsappAccount;
  return Boolean(candidate.id && candidate.name && candidate.phone && candidate.phoneNumberId && candidate.wabaId && candidate.verifyToken && candidate.apiVersion && candidate.accessToken && candidate.createdAt);
}

function maskToken(token: string) {
  if (token.length <= 12) return "••••••";
  return `${token.slice(0, 5)}••••${token.slice(-5)}`;
}
