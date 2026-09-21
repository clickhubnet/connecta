"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  Bot, BrainCircuit, Check, ChevronRight, CircleDollarSign, GripVertical,
  KeyRound, Pencil, Plus, Save, Search, Trash2, Workflow, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/cards/metric-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApiResource } from "@/hooks/use-api-resource";

type FlowStep = { id: string; title: string; message: string; state: string };
type PlanItem = { id: string; name: string; speed: string; price: string | number; description: string | null; active: boolean; order: number };
type AgentItem = {
  id: string; name: string; gender: "MALE" | "FEMALE"; personality: string; rules: Record<string, unknown>;
  flow: { steps?: FlowStep[] | string[] }; active: boolean; minTypingSeconds: number; maxTypingSeconds: number;
  enableReadReceipt: boolean; enableTyping: boolean; enableReplyDelay: boolean; openAiModel: string | null;
  plans: PlanItem[];
};
type Tab = "agents" | "plans" | "openai" | "flow";

const defaultSteps: FlowStep[] = [
  { id: "start", state: "START", title: "Entrada Meta Ads", message: "Olá 👋! Eu sou o {{agente}}, consultor da Claro. Estou aqui pra facilitar seu atendimento. Pode me informar o CEP da instalação?" },
  { id: "cep", state: "ASK_CEP", title: "Consultar cobertura", message: "Validar o CEP na base do CRM. Se houver viabilidade, confirmar endereço e pedir nome completo. Se não houver, informar indisponibilidade e finalizar." },
  { id: "name", state: "ASK_NAME", title: "Nome completo", message: "Boa notícia 🎉! Temos viabilidade no CEP {{cep}}, localizado {{endereco}}. Consigo te atender com a Claro 🚀. Para seguir com a contratação, preciso coletar alguns dados seus. Qual é o seu nome completo?" },
  { id: "document", state: "ASK_DOCUMENT", title: "CPF ou CNPJ", message: "Ótimo, {{nome}}! 😊 Agora, por favor, me informe o seu CPF ou CNPJ." },
  { id: "birth-date", state: "ASK_BIRTH_DATE", title: "Data de nascimento", message: "CPF válido! ✅ Agora, por favor, me informe a sua data de nascimento." },
  { id: "street-number", state: "ASK_STREET_NUMBER", title: "Número da residência", message: "Data de nascimento aceita! 🎉 Agora, por favor, me informe o número da sua residência." },
  { id: "complement", state: "ASK_COMPLEMENT", title: "Complemento", message: "Perfeito! Agora, você poderia me informar se há algum complemento para o endereço?" },
  { id: "billing", state: "ASK_BILLING_DUE_DAY", title: "Vencimento", message: "Agora, por favor, me informe a data de vencimento. Pode ser 5, 8, 10, 15, 20 ou 25 do mês." },
  { id: "email", state: "ASK_EMAIL", title: "E-mail", message: "Data de vencimento registrada. 📅 Agora, preciso do seu e-mail, por favor! 😊" },
  { id: "recommend-plan", state: "RECOMMEND_PLAN", title: "Recomendação de plano", message: "Recomendar o melhor plano com base nos planos ativos do banco e perguntar se o cliente quer seguir com ele ou ver outras opções." },
  { id: "choose-plan", state: "CHOOSE_PLAN", title: "Escolha do plano", message: "Listar planos ativos cadastrados no banco, permitir escolha por nome, velocidade, número ou intenção equivalente." },
  { id: "confirm", state: "CONFIRM_DATA", title: "Confirmação dos dados", message: "Enviar resumo com CEP, nome, documento, nascimento, endereço, e-mail, vencimento e plano. Se estiver correto, criar lead na aba Leads." },
  { id: "finish", state: "FINISHED", title: "Finalização", message: "Perfeito! 🎉 Seus dados foram confirmados. Vou cadastrar aqui, deixa o celular ligado 📱, porque aprovando você receberá uma ligação da nossa central." },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function AgentCenter({ initialTab = "agents", standalone = false }: { initialTab?: Tab; standalone?: boolean }) {
  const plans = useApiResource<PlanItem[]>("/api/plans");
  const agents = useApiResource<AgentItem[]>("/api/agents");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [modal, setModal] = useState<null | "agent" | "plan" | "openai">(null);
  const [editingAgent, setEditingAgent] = useState<AgentItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredAgents = useMemo(() => (agents.data ?? []).filter((item) =>
    `${item.name} ${item.personality}`.toLowerCase().includes(query.toLowerCase())), [agents.data, query]);
  const filteredPlans = useMemo(() => (plans.data ?? []).filter((item) =>
    `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [plans.data, query]);

  async function request(url: string, method: string, body?: unknown) {
    setSaving(true); setNotice("");
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    setSaving(false); setNotice(result.message ?? (response.ok ? "Alterações salvas." : "Não foi possível salvar."));
    if (!response.ok) throw new Error(result.message);
    return result;
  }

  async function saveAgent(payload: Record<string, unknown>) {
    await request(editingAgent ? `/api/agents/${editingAgent.id}` : "/api/agents", editingAgent ? "PUT" : "POST", payload);
    await agents.refresh(); setModal(null); setEditingAgent(null);
  }
  async function savePlan(payload: Record<string, unknown>) {
    await request(editingPlan ? `/api/plans/${editingPlan.id}` : "/api/plans", editingPlan ? "PUT" : "POST", payload);
    await plans.refresh(); setModal(null); setEditingPlan(null);
  }
  async function remove(kind: "agents" | "plans", id: string) {
    if (!window.confirm("Deseja realmente excluir este cadastro?")) return;
    await request(`/api/${kind}/${id}`, "DELETE");
    await (kind === "agents" ? agents.refresh() : plans.refresh());
  }

  const tabs = [
    { id: "agents" as const, label: "Agentes", icon: Bot },
    { id: "plans" as const, label: "Planos", icon: CircleDollarSign },
    { id: "openai" as const, label: "OpenAI", icon: BrainCircuit },
    { id: "flow" as const, label: "Fluxo de Mensagens", icon: Workflow },
  ];

  const descriptions = { agents: "Sua equipe de atendimento virtual", plans: "Organize seu catálogo comercial", openai: "Modelos e regras de atendimento", flow: "Organize cada etapa da conversa" };
  const currentTab = tabs.find((item) => item.id === tab)!;
  const agentItems = agents.data ?? [];
  const planItems = plans.data ?? [];
  const loading = tab === "plans" ? plans.loading : agents.loading;

  return <div className="management-page sales-center space-y-5">
    <div className="management-toolbar flex flex-wrap items-center justify-between gap-3">
      {standalone && <div className="flex items-center gap-3"><span className="management-heading-icon"><currentTab.icon className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">{currentTab.label}</h2><p className="mt-1 text-xs text-muted-foreground">{descriptions[tab]}</p></div></div>}
      <div className="flex overflow-x-auto">
        {(standalone ? [] : tabs).map((item) => <button key={item.id} onClick={() => { setTab(item.id); setQuery(""); }}
          className={`flex h-12 items-center gap-2 border-b-2 px-5 text-sm font-medium ${tab === item.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <item.icon className="h-4 w-4" />{item.label}
        </button>)}
      </div>
      {tab === "agents" && <Button size="sm" onClick={() => { setEditingAgent(null); setModal("agent"); }}><Plus className="h-4 w-4" />Cadastrar agente</Button>}
      {tab === "plans" && <Button size="sm" onClick={() => { setEditingPlan(null); setModal("plan"); }}><Plus className="h-4 w-4" />Cadastrar plano</Button>}
      {tab === "openai" && <Button size="sm" variant="outline" onClick={() => setModal("openai")}><KeyRound className="h-4 w-4" />Credenciais OpenAI</Button>}
    </div>

    {notice && <p className="rounded-md border bg-card px-4 py-3 text-sm">{notice}</p>}
    {(agents.error || plans.error) && <p role="alert" className="rounded-xl border border-destructive/20 bg-card p-4 text-sm text-destructive">{agents.error || plans.error}</p>}

    {tab !== "flow" && <div className="grid gap-4 sm:grid-cols-3">
      {tab === "agents" ? <>
        <MetricCard title="Agentes" value={loading ? "..." : String(agentItems.length)} helper="Equipe virtual cadastrada" icon={Bot} />
        <MetricCard title="Ativos" value={loading ? "..." : String(agentItems.filter((item) => item.active).length)} helper="Agentes habilitados" icon={Check} tone="teal" />
        <MetricCard title="Planos vinculados" value={loading ? "..." : String(new Set(agentItems.flatMap((item) => item.plans.map((plan) => plan.id))).size)} helper="Catálogo disponível aos agentes" icon={CircleDollarSign} tone="indigo" />
      </> : tab === "plans" ? <>
        <MetricCard title="Planos" value={loading ? "..." : String(planItems.length)} helper="Itens no catálogo" icon={CircleDollarSign} />
        <MetricCard title="Ativos" value={loading ? "..." : String(planItems.filter((item) => item.active).length)} helper="Disponíveis para comercialização" icon={Check} tone="teal" />
        <MetricCard title="Valor médio" value={loading ? "..." : money.format(planItems.length ? planItems.reduce((sum, item) => sum + Number(item.price), 0) / planItems.length : 0)} helper="Média dos preços cadastrados" icon={CircleDollarSign} tone="amber" />
      </> : <>
        <MetricCard title="Agentes" value={loading ? "..." : String(agentItems.length)} helper="Configurações de inteligência" icon={BrainCircuit} />
        <MetricCard title="Modelo próprio" value={loading ? "..." : String(agentItems.filter((item) => item.openAiModel).length)} helper="Agentes com modelo específico" icon={Bot} tone="indigo" />
        <MetricCard title="Regras" value={loading ? "..." : String(agentItems.reduce((sum, item) => sum + Object.keys(item.rules || {}).length, 0))} helper="Orientações de atendimento" icon={Workflow} tone="teal" />
      </>}
    </div>}

    {(tab === "agents" || tab === "plans") && <SearchBox value={query} onChange={setQuery} placeholder={tab === "agents" ? "Pesquisar agentes" : "Pesquisar planos"} />}

    {tab === "agents" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredAgents.map((agent) => <AgentCard key={agent.id} agent={agent}
        onEdit={() => { setEditingAgent(agent); setModal("agent"); }} onDelete={() => remove("agents", agent.id)} />)}
      {!filteredAgents.length && <Empty text={loading ? "Carregando agentes..." : query ? "Nenhum agente encontrado para esta pesquisa" : "Cadastre seu primeiro agente para começar"} />}
    </div>}

    {tab === "plans" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredPlans.map((plan) => <PlanCard key={plan.id} plan={plan}
        onEdit={() => { setEditingPlan(plan); setModal("plan"); }} onDelete={() => remove("plans", plan.id)} />)}
      {!filteredPlans.length && <Empty text={loading ? "Carregando planos..." : query ? "Nenhum plano encontrado para esta pesquisa" : "Cadastre seu primeiro plano para montar o catálogo"} />}
    </div>}

    {tab === "openai" && (loading ? <Empty text="Carregando configurações..." /> : <OpenAiPanel agents={agents.data ?? []} onEdit={(agent) => { setEditingAgent(agent); setModal("agent"); }} />)}
    {tab === "flow" && (loading ? <Empty text="Carregando fluxos..." /> : <FlowEditor agents={agents.data ?? []} onSave={async (agent, steps) => {
      await request(`/api/agents/${agent.id}`, "PUT", { flow: { steps } }); await agents.refresh();
    }} />)}

    {modal === "agent" && <AgentModal agent={editingAgent} plans={plans.data ?? []} saving={saving} onClose={() => setModal(null)} onSave={saveAgent} />}
    {modal === "plan" && <PlanModal plan={editingPlan} saving={saving} onClose={() => setModal(null)} onSave={savePlan} />}
    {modal === "openai" && <OpenAiCredentials saving={saving} onClose={() => setModal(null)} onSave={async (payload) => { await request("/api/settings", "PUT", payload); setModal(null); }} />}
  </div>;
}

function AgentCard({ agent, onEdit, onDelete }: { agent: AgentItem; onEdit: () => void; onDelete: () => void }) {
  return <Card className="management-surface sales-profile"><CardContent className="p-0">
    <button className="w-full p-5 text-left" onClick={onEdit}>
      <div className="flex items-start justify-between gap-3"><div className="sales-avatar"><Bot className="h-6 w-6" /></div>
        <span className={`rounded-full px-2 py-1 text-xs ${agent.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{agent.active ? "Ativo" : "Inativo"}</span></div>
      <h3 className="mt-4 font-semibold">{agent.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{agent.personality}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs"><div><p className="text-muted-foreground">Catálogo</p><p className="mt-1 font-medium">{agent.plans.length} planos</p></div><div><p className="text-muted-foreground">Inteligência</p><p className="mt-1 truncate font-medium">{agent.openAiModel || "Modelo global"}</p></div></div>
    </button>
    <div className="flex justify-end gap-2 border-t px-4 py-3"><Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" />Editar</Button><Button size="icon" variant="ghost" aria-label="Excluir agente" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
  </CardContent></Card>;
}

function PlanCard({ plan, onEdit, onDelete }: { plan: PlanItem; onEdit: () => void; onDelete: () => void }) {
  return <Card className="management-surface sales-profile"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><span className="sales-avatar"><CircleDollarSign className="h-6 w-6" /></span><span className={`rounded-full px-2 py-1 text-xs ${plan.active ? "bg-emerald-100 text-emerald-700" : "bg-muted"}`}>{plan.active ? "Ativo" : "Inativo"}</span></div><h3 className="mt-4 font-semibold">{plan.name}</h3>
    <div className="my-4 rounded-xl border border-primary/10 bg-primary/[.025] p-4"><p className="text-xs text-muted-foreground">Valor do plano</p><p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{money.format(Number(plan.price))}</p>{plan.speed && <p className="mt-2 text-xs font-medium text-primary">{plan.speed}</p>}</div><p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{plan.description || "Sem descrição"}</p>
    <div className="mt-4 flex justify-end gap-2 border-t pt-3"><Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" />Editar</Button><Button size="icon" variant="ghost" aria-label="Excluir plano" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
  </CardContent></Card>;
}

function OpenAiPanel({ agents, onEdit }: { agents: AgentItem[]; onEdit: (agent: AgentItem) => void }) {
  return <div className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Inteligência dos agentes</h2><span className="text-xs text-muted-foreground">Configuração por agente</span></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{agents.map((agent) => <Card key={agent.id} className="management-surface sales-profile"><CardContent className="p-5">
      <div className="flex items-center gap-3"><span className="sales-avatar"><BrainCircuit className="h-6 w-6" /></span><div><h3 className="font-semibold">{agent.name}</h3><p className="mt-1 text-xs text-muted-foreground">{agent.active ? "Agente ativo" : "Agente inativo"}</p></div></div>
      <div className="mt-5 rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Modelo de linguagem</p><p className="mt-1 text-sm font-semibold">{agent.openAiModel || "Modelo global"}</p></div>
      <p className="mt-4 line-clamp-3 min-h-16 text-sm leading-relaxed text-muted-foreground">{agent.personality}</p><div className="mt-4 flex items-center justify-between gap-2 border-t pt-3"><span className="text-xs text-muted-foreground">{Object.keys(agent.rules || {}).length} regras</span><Button variant="ghost" size="sm" onClick={() => onEdit(agent)}>Configurar<ChevronRight className="h-4 w-4" /></Button></div>
    </CardContent></Card>)}{!agents.length && <Empty text="Cadastre um agente para configurar sua inteligência" />}</div></div>;
}

function FlowEditor({ agents, onSave }: { agents: AgentItem[]; onSave: (agent: AgentItem, steps: FlowStep[]) => Promise<void> }) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const selected = agents.find((item) => item.id === agentId) ?? agents[0];
  const [drafts, setDrafts] = useState<Record<string, FlowStep[]>>({});
  const [editing, setEditing] = useState<FlowStep | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!selected) return <Empty text="Cadastre um agente antes de configurar o fluxo" />;
  const steps = drafts[selected.id] ?? normalizeSteps(selected.flow?.steps);
  const setSteps = (next: FlowStep[]) => setDrafts((value) => ({ ...value, [selected.id]: next }));
  function drop(index: number) { if (dragIndex === null || dragIndex === index) return; const next = [...steps]; const [item] = next.splice(dragIndex, 1); next.splice(index, 0, item); setSteps(next); setDragIndex(null); }
  return <div className="space-y-4">
    <div className="management-toolbar flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Jornada de atendimento</h2><p className="mt-1 text-xs text-muted-foreground">{steps.length} etapas · Arraste os blocos para reorganizar.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Agente do fluxo" className="h-10 rounded-md border bg-background px-3 text-sm" value={selected.id} onChange={(e) => setAgentId(e.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select><Button variant="outline" onClick={() => setEditing({ id: crypto.randomUUID(), state: `CUSTOM_${Date.now()}`, title: "Nova mensagem", message: "" })}><Plus className="h-4 w-4" />Mensagem</Button><Button onClick={() => onSave(selected, steps)}><Save className="h-4 w-4" />Salvar fluxo</Button></div></div>
    <div className="sales-flow-canvas overflow-x-auto rounded-2xl border p-6 sm:p-8"><div className="flex min-w-max items-center py-12 sm:py-20">
      {steps.map((step, index) => <div key={step.id} className="flex items-center" onDragOver={(e) => e.preventDefault()} onDrop={() => drop(index)}>
        {index > 0 && <div aria-hidden="true" className="relative h-0.5 w-12 bg-primary/40"><ChevronRight className="absolute -right-1 -top-2 h-4 w-4 text-primary" /></div>}
        <div draggable onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} className="sales-flow-step w-72 cursor-grab overflow-hidden rounded-2xl border bg-card active:cursor-grabbing">
          <div className="flex items-center justify-between border-b bg-primary/[.035] px-4 py-3"><div className="flex items-center gap-2"><GripVertical className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold text-primary">Etapa {String(index + 1).padStart(2, "0")}</span></div><div className="flex"><button className="rounded-lg p-2 hover:bg-muted" title="Editar mensagem" onClick={() => setEditing(step)}><Pencil className="h-4 w-4" /></button><button className="rounded-lg p-2 hover:bg-muted" title="Excluir mensagem" onClick={() => setSteps(steps.filter((item) => item.id !== step.id))}><Trash2 className="h-4 w-4 text-destructive" /></button></div></div>
          <div className="p-4"><h3 className="font-semibold">{step.title}</h3><p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{step.message}</p></div><div className="border-t px-3 py-2 text-xs text-muted-foreground">Mensagem #{index + 1}</div>
        </div>
      </div>)}
    </div></div>
    {editing && <Modal title={steps.some((item) => item.id === editing.id) ? "Editar mensagem" : "Adicionar mensagem"} onClose={() => setEditing(null)}><form onSubmit={(e) => { e.preventDefault(); const exists = steps.some((item) => item.id === editing.id); setSteps(exists ? steps.map((item) => item.id === editing.id ? editing : item) : [...steps, editing]); setEditing(null); }} className="space-y-3"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Nome da etapa" required /><Input value={editing.state} onChange={(e) => setEditing({ ...editing, state: e.target.value.toUpperCase().replace(/\s/g, "_") })} placeholder="Código da etapa" required /><Textarea className="min-h-32" value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} placeholder="Mensagem enviada ao cliente" required /><Button className="w-full"><Save className="h-4 w-4" />Salvar mensagem</Button></form></Modal>}
  </div>;
}

function AgentModal({ agent, plans, saving, onClose, onSave }: { agent: AgentItem | null; plans: PlanItem[]; saving: boolean; onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<void> }) {
  const [rules, setRules] = useState(() => rulesText(agent?.rules));
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); await onSave({
    name: f.get("name"), gender: f.get("gender"), personality: f.get("personality"), rules: textRules(rules), active: f.get("active") === "on",
    minTypingSeconds: Number(f.get("minTypingSeconds") || 2), maxTypingSeconds: Number(f.get("maxTypingSeconds") || 4), openAiModel: f.get("openAiModel"),
    enableReadReceipt: f.get("enableReadReceipt") === "on", enableTyping: f.get("enableTyping") === "on", enableReplyDelay: f.get("enableReplyDelay") === "on",
    planIds: f.getAll("planIds"), flow: agent?.flow?.steps ? agent.flow : { steps: defaultSteps },
  }); }
  return <Modal title={agent ? `Editar ${agent.name}` : "Cadastrar agente"} onClose={onClose}><form className="space-y-5" onSubmit={submit}>
    <Section title="Identidade e inteligência"><div className="grid gap-3 sm:grid-cols-2"><Input name="name" defaultValue={agent?.name ?? ""} placeholder="Nome do chatbot" required /><select name="gender" defaultValue={agent?.gender ?? "MALE"} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="MALE">Masculino</option><option value="FEMALE">Feminino</option></select></div><Textarea className="min-h-28" name="personality" defaultValue={agent?.personality ?? ""} placeholder="Personalidade do chatbot" required /><Textarea className="min-h-28" value={rules} onChange={(e) => setRules(e.target.value)} placeholder="Uma regra por linha" /><Input name="openAiModel" defaultValue={agent?.openAiModel ?? "gpt-4o-mini"} placeholder="Modelo OpenAI" /></Section>
    <Section title="WhatsApp Meta"><div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">As credenciais do WhatsApp Cloud API são globais e devem ser configuradas no servidor com as variáveis META_*.</div></Section>
    <Section title="Planos atendidos"><div className="grid gap-2 sm:grid-cols-2">{plans.map((plan) => <label key={plan.id} className="flex items-center gap-2 rounded-md border p-3 text-sm"><input name="planIds" value={plan.id} type="checkbox" defaultChecked={agent?.plans.some((item) => item.id === plan.id)} />{plan.name} · {money.format(Number(plan.price))}</label>)}</div></Section>
    <Section title="Comportamento"><div className="grid gap-3 sm:grid-cols-2"><Input name="minTypingSeconds" type="number" min="0" defaultValue={agent?.minTypingSeconds ?? 2} placeholder="Tempo mínimo" /><Input name="maxTypingSeconds" type="number" min="1" defaultValue={agent?.maxTypingSeconds ?? 4} placeholder="Tempo máximo" /></div><div className="grid gap-2 sm:grid-cols-2"><CheckBox name="active" label="Agente ativo" checked={agent?.active ?? true} /><CheckBox name="enableReadReceipt" label="Confirmar leitura" checked={agent?.enableReadReceipt ?? true} /><CheckBox name="enableTyping" label="Simular digitação" checked={agent?.enableTyping ?? true} /><CheckBox name="enableReplyDelay" label="Atraso humanizado" checked={agent?.enableReplyDelay ?? true} /></div></Section>
    <Button className="w-full" disabled={saving}><Save className="h-4 w-4" />{saving ? "Salvando..." : "Salvar agente"}</Button>
  </form></Modal>;
}

function PlanModal({ plan, saving, onClose, onSave }: { plan: PlanItem | null; saving: boolean; onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<void> }) {
  return <Modal title={plan ? "Editar plano" : "Cadastrar plano"} onClose={onClose}><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); await onSave({ name: f.get("name"), description: f.get("description"), price: Number(f.get("price")), speed: plan?.speed ?? "", active: f.get("active") === "on", order: Number(f.get("order") || 0) }); }}><Input name="name" defaultValue={plan?.name ?? ""} placeholder="Nome do plano" required /><Textarea name="description" defaultValue={plan?.description ?? ""} placeholder="Descrição do plano" /><div className="grid gap-3 sm:grid-cols-2"><Input name="price" defaultValue={plan?.price ?? ""} placeholder="Valor do plano" type="number" min="0" step="0.01" required /><Input name="order" defaultValue={plan?.order ?? 0} placeholder="Ordem" type="number" /></div><CheckBox name="active" label="Plano ativo" checked={plan?.active ?? true} /><Button className="w-full" disabled={saving}><Save className="h-4 w-4" />Salvar plano</Button></form></Modal>;
}

function OpenAiCredentials({ saving, onClose, onSave }: { saving: boolean; onClose: () => void; onSave: (data: Record<string, string>) => Promise<void> }) {
  return <Modal title="Credenciais OpenAI" onClose={onClose}><form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const key = String(f.get("openAiApiKey") || ""); const payload: Record<string, string> = { openAiModel: String(f.get("openAiModel") || "gpt-4o-mini") }; if (key) payload.openAiApiKey = key; await onSave(payload); }}><div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">A chave é compartilhada por todos os agentes e nunca é exibida nesta tela.</div><Input name="openAiApiKey" type="password" placeholder="Nova chave da OpenAI" /><Input name="openAiModel" defaultValue="gpt-4o-mini" placeholder="Modelo padrão" /><Button className="w-full" disabled={saving}><KeyRound className="h-4 w-4" />Atualizar credenciais</Button></form></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4"><h2 className="font-semibold">{title}</h2><Button size="icon" variant="ghost" onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></Button></div><div className="p-6">{children}</div></div></div>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <fieldset className="space-y-3 rounded-xl border bg-card p-4"><legend className="px-2 text-sm font-semibold">{title}</legend>{children}</fieldset>; }
function CheckBox({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><input name={name} type="checkbox" defaultChecked={checked} />{label}</label>; }
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <div className="relative max-w-md"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>; }
function Empty({ text }: { text: string }) { return <div role="status" className="col-span-full flex min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground"><span className="management-heading-icon"><Workflow className="h-5 w-5" /></span>{text}</div>; }
function rulesText(rules?: Record<string, unknown>) {
  const legacyRules: Record<string, string> = {
    neverSayAi: "Nunca informar ao cliente que é uma inteligência artificial.",
    followCommercialFlow: "Seguir sempre o fluxo comercial configurado.",
    validateCepBeforePlans: "Validar o CEP antes de apresentar os planos disponíveis.",
  };

  return Object.entries(rules ?? {})
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([key, value]) => legacyRules[key] ?? (typeof value === "string" ? value : String(value)))
    .join("\n");
}
function textRules(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean).reduce<Record<string, string>>((all, item, index) => ({ ...all, [`rule_${index + 1}`]: item }), {}); }
function normalizeSteps(value?: FlowStep[] | string[]): FlowStep[] { if (!Array.isArray(value) || !value.length) return defaultSteps; return value.map((item, index) => typeof item === "string" ? { id: `${item}-${index}`, state: item, title: item.replace(/_/g, " "), message: defaultSteps.find((step) => step.state === item)?.message ?? "Mensagem configurável" } : item); }
