"use client";

import { createPortal } from "react-dom";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { MetricCard } from "@/components/cards/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { navigationItems, navigationGroups, canAccessPage } from "@/config/navigation";
import { permissions } from "@/constants/permissions";
import { useApiResource } from "@/hooks/use-api-resource";
import { useCurrentUser } from "@/hooks/use-current-user";

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  role: "ADMIN" | "EMPLOYEE";
  status: "ACTIVE" | "BLOCKED";
  permissions: Record<string, boolean> | null;
  lastLoginAt?: string | null;
};

type CategoryKey = "all" | "admin" | "employee" | "blocked" | "untitled";

const permissionGroups = [
  { title: "Dashboard", access: permissions.dashboardView, items: [[permissions.dashboardView, "Acessar Dashboard"], [permissions.dashboardEdit, "Editar informações"]] },
  { title: "Leads", access: permissions.leadsView, items: [[permissions.leadsView, "Acessar Leads"], [permissions.leadsCreate, "Cadastrar leads"], [permissions.leadsEdit, "Editar leads"], [permissions.leadsDelete, "Excluir leads"], [permissions.leadsMoveKanban, "Mover no Kanban"], [permissions.leadsExport, "Exportar planilha"]] },
  { title: "Compromissos", access: permissions.appointmentsView, items: [[permissions.appointmentsView, "Acessar Compromissos"], [permissions.appointmentsCreate, "Criar compromissos"], [permissions.appointmentsEdit, "Editar compromissos"], [permissions.appointmentsDelete, "Excluir compromissos"]] },
  { title: "Despesas", access: permissions.expensesView, items: [[permissions.expensesView, "Acessar Despesas"], [permissions.expensesEdit, "Cadastrar e editar despesas"], [permissions.expensesDelete, "Excluir despesas"]] },
  { title: "Cobertura", access: permissions.cepsView, items: [[permissions.cepsView, "Consultar cobertura de CEPs"]] },
  { title: "Agentes e planos", access: permissions.agentsEdit, items: [[permissions.agentsEdit, "Acessar agentes"], [permissions.agentsCreate, "Cadastrar agentes"], [permissions.plansEdit, "Editar planos"], [permissions.openAiEdit, "Configurar OpenAI"]] },
  { title: "Configurações", access: permissions.settingsView, items: [[permissions.settingsView, "Acessar Configurações"], [permissions.settingsEdit, "Editar configurações"]] },
] as const;

const PAGE_SIZE = 10;

export function UserManagement() {
  const usersResource = useApiResource<UserItem[]>("/api/users");
  const currentUser = useCurrentUser();
  const [editing, setEditing] = useState<UserItem | null | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [page, setPage] = useState(1);

  const users = usersResource.data ?? [];
  const categories = useMemo(() => {
    const adminCount = users.filter((user) => user.role === "ADMIN").length;
    const employeeCount = users.filter((user) => user.role === "EMPLOYEE").length;
    const blockedCount = users.filter((user) => user.status === "BLOCKED").length;
    const untitledCount = users.filter((user) => !user.title?.trim()).length;

    return [
      { key: "all" as const, label: "Todos", count: users.length },
      { key: "admin" as const, label: "Administradores", count: adminCount },
      { key: "employee" as const, label: "Funcionários", count: employeeCount },
      { key: "blocked" as const, label: "Bloqueados", count: blockedCount },
      { key: "untitled" as const, label: "sem cargo", count: untitledCount },
    ];
  }, [users]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    return users
      .filter((user) => {
        if (category === "admin") return user.role === "ADMIN";
        if (category === "employee") return user.role === "EMPLOYEE";
        if (category === "blocked") return user.status === "BLOCKED";
        if (category === "untitled") return !user.title?.trim();
        return true;
      })
      .filter((user) => {
        if (!normalizedQuery) return true;
        return `${user.name} ${user.email} ${user.phone ?? ""} ${user.title ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [users, category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function request(id: string | null, payload?: Record<string, unknown>, method = "PUT") {
    setSaving(true);
    setNotice("");
    const response = await fetch(id ? `/api/users/${id}` : "/api/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const result = await response.json();
    setSaving(false);
    setNotice(result.message ?? "Operação concluída.");
    if (!response.ok) return false;
    await usersResource.refresh();
    return true;
  }

  async function save(payload: Record<string, unknown>) {
    const ok = await request(editing?.id ?? null, payload, editing ? "PUT" : "POST");
    if (ok) setEditing(undefined);
  }

  async function toggleBlock(user: UserItem) {
    if (user.id === currentUser.data?.id) return setNotice("Você não pode bloquear a própria conta.");
    await request(user.id, { status: user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE" });
  }

  async function remove(user: UserItem) {
    if (user.id === currentUser.data?.id) return setNotice("Você não pode excluir a própria conta.");
    if (!window.confirm(`Excluir o cadastro ${user.name}?`)) return;
    await request(user.id, undefined, "DELETE");
  }

  function changeCategory(nextCategory: CategoryKey) {
    setCategory(nextCategory);
    setPage(1);
  }

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <div className="management-page space-y-5">
      <div className="management-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="management-heading-icon"><UserCog className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Gestão de usuários</h2><p className="mt-1 text-xs text-muted-foreground">Organize sua equipe e controle os acessos.</p></div></div>
        <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Cadastrar usuário</Button>
      </div>
      {notice && <p role="status" className="rounded-xl border bg-card px-4 py-3 text-sm">{notice}</p>}
      {usersResource.error && <p role="alert" className="text-sm text-destructive">{usersResource.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Usuários" value={usersResource.loading ? "..." : String(users.length)} helper="Pessoas cadastradas na equipe" icon={UserCog} />
        <MetricCard title="Ativos" value={usersResource.loading ? "..." : String(users.filter((user) => user.status === "ACTIVE").length)} helper="Acesso habilitado à plataforma" icon={CheckCircle2} tone="teal" />
        <MetricCard title="Administradores" value={usersResource.loading ? "..." : String(users.filter((user) => user.role === "ADMIN").length)} helper="Gestão completa do sistema" icon={ShieldCheck} tone="indigo" />
        <MetricCard title="Funcionários" value={usersResource.loading ? "..." : String(users.filter((user) => user.role === "EMPLOYEE").length)} helper="Funcionários cadastrados na equipe" icon={UserCog} tone="amber" />
      </div>
      <div className="management-surface border bg-card">
        <div className="space-y-4 border-b p-4">
          <div className="relative max-w-lg"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Pesquisar usuários" className="pl-9" value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Pesquisar nome, e-mail, telefone ou cargo..." /></div>
          <div className="flex flex-wrap gap-2">{categories.map((item) => <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => changeCategory(item.key)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${category === item.key ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>{item.label}<span className="rounded-md bg-background/15 px-1.5 tabular-nums">{item.count}</span></button>)}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="management-table w-full min-w-[800px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground"><tr>{["Usuário", "Contato", "Perfil", "Status", "Ações"].map((title) => <th key={title} className={`px-5 py-3 font-medium ${title === "Ações" ? "text-right" : ""}`}>{title}</th>)}</tr></thead>
            <tbody>
              {usersResource.loading ? <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Carregando usuários...</td></tr> : paginated.map((user) => <tr key={user.id} className="border-b last:border-0">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/5 text-xs font-semibold text-primary">{user.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><p className="font-semibold">{user.name}{user.id === currentUser.data?.id && <span className="ml-2 text-xs font-normal text-primary">Você</span>}</p><p className="mt-1 text-xs text-muted-foreground">{user.title || "Sem cargo informado"}</p></div></div></td>
                <td className="px-5 py-4"><p>{user.email}</p><p className="mt-1 text-xs text-muted-foreground">{user.phone || "Sem telefone"}</p></td>
                <td className="px-5 py-4"><span className="rounded-lg bg-muted/60 px-2.5 py-1 text-xs font-medium">{user.role === "ADMIN" ? "Administrador" : "Funcionário"}</span></td>
                <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.status === "ACTIVE" ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}{user.status === "ACTIVE" ? "Ativo" : "Bloqueado"}</span></td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2">
                  <IconAction title="Editar usuário" onClick={() => setEditing(user)} disabled={saving}><Pencil className="h-4 w-4" /></IconAction>
                  <IconAction title={user.status === "ACTIVE" ? "Bloquear usuário" : "Desbloquear usuário"} onClick={() => toggleBlock(user)} disabled={saving || user.id === currentUser.data?.id}>{user.status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</IconAction>
                  <IconAction title="Excluir usuário" onClick={() => remove(user)} disabled={saving || user.id === currentUser.data?.id} destructive><Trash2 className="h-4 w-4" /></IconAction>
                </div></td>
              </tr>)}
              {!usersResource.loading && !paginated.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"><span className="text-xs text-muted-foreground">{filtered.length} usuários · Página {safePage} de {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Próxima</Button></div></div>
      </div>
      {editing !== undefined && <UserModal user={editing} saving={saving} onClose={() => setEditing(undefined)} onSave={save} />}
    </div>
  );
}

function UserModal({ user, saving, onClose, onSave }: { user: UserItem | null; saving: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [role, setRole] = useState<UserItem["role"]>(user?.role ?? "EMPLOYEE");
  const [selected, setSelected] = useState<Record<string, boolean>>(() => ({
    ...user?.permissions,
    ...Object.fromEntries(navigationItems.filter((item) => !("adminOnly" in item)).map((item) => [
      `page:${item.href}`, user ? canAccessPage(user, item) : false,
    ])),
  }));
  function togglePage(item: (typeof navigationItems)[number], checked: boolean) {
    setSelected((current) => ({ ...current, [`page:${item.href}`]: checked, ...(checked ? { [item.permission]: true } : {}) }));
  }

  const toggleGroup = (group: typeof permissionGroups[number], checked: boolean) =>
    setSelected((current) => ({ ...current, ...Object.fromEntries(group.items.map(([key]) => [key, checked])) }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    await onSave({
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      title: data.get("title"),
      role,
      status: user?.status ?? "ACTIVE",
      permissions: role === "ADMIN" ? {} : selected,
      ...(password ? { password } : {}),
    });
  }

  return (
    <Modal title={user ? `Editar ${user.name}` : "Cadastrar usuário"} onClose={onClose}>
      <form className="space-y-5" onSubmit={submit}>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold">Dados do usuário</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="name" defaultValue={user?.name ?? ""} placeholder="Nome completo" required />
            <Input name="email" defaultValue={user?.email ?? ""} placeholder="E-mail" type="email" required />
            <Input name="phone" defaultValue={user?.phone ?? ""} placeholder="Telefone" />
            <Input name="title" defaultValue={user?.title ?? ""} placeholder="Cargo ou função" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as UserItem["role"])}
            >
              <option value="EMPLOYEE">Funcionário</option>
              <option value="ADMIN">Administrador</option>
            </select>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                name="password"
                type="password"
                minLength={8}
                required={!user}
                placeholder={user ? "Nova senha (opcional)" : "Senha inicial"}
              />
            </div>
          </div>
        </fieldset>

        {role === "ADMIN" ? (
          <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Acesso administrativo completo</p>
              <p>Este usuário poderá acessar todas as abas e funções do sistema.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Abas permitidas</legend>
            <p className="text-xs text-muted-foreground">Selecione as abas que este funcionário poderá acessar. Usuários é uma área exclusiva de administradores.</p>
            {navigationGroups.map((group) => <div key={group} className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold text-muted-foreground">{group || "Principal"}</h3>
              <div className="grid gap-2 sm:grid-cols-2">{navigationItems.filter((item) => item.group === group && !("adminOnly" in item)).map((item) => <label key={item.href} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${selected[`page:${item.href}`] ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                <input type="checkbox" className="h-4 w-4 accent-red-600" checked={Boolean(selected[`page:${item.href}`])} onChange={(event) => togglePage(item, event.target.checked)} />
                <item.icon className="h-4 w-4 text-primary" />{item.title}
              </label>)}</div>
            </div>)}
          </fieldset>
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-semibold">Permissões de ações</summary>
            <p className="my-3 text-xs text-muted-foreground">Defina também quais operações o funcionário pode realizar nas abas liberadas.</p>
          <fieldset>
            <div className="grid gap-3 md:grid-cols-2">
              {permissionGroups.map((group) => {
                const all = group.items.every(([key]) => selected[key]);
                return (
                  <div key={group.title} className="rounded-xl border bg-card p-4">
                    <label className="flex items-center justify-between gap-3 font-medium">
                      <span>{group.title}</span>
                      <input type="checkbox" checked={all} onChange={(event) => toggleGroup(group, event.target.checked)} />
                    </label>
                    <div className="mt-3 space-y-2 border-t pt-3">
                      {group.items.map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[key])}
                            onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.checked }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
          </details>
          </div>
        )}

        <Button className="w-full" disabled={saving}>
          <UserCog className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar usuário"}
        </Button>
      </form>
    </Modal>
  );
}

function IconAction({
  title,
  onClick,
  disabled,
  destructive,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
        destructive
          ? "border-rose-200 text-rose-600 hover:bg-rose-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] !m-0 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <Button type="button" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>, document.body
  );
}
