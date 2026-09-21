import { ChartPie, Home, Bot, CalendarCheck, MessageCircleMore, ReceiptText, MapPinned, Megaphone, Settings, Users, Workflow, BrainCircuit, CircleDollarSign, History, Smartphone } from "lucide-react";
import { permissions } from "@/constants/permissions";

export const navigationItems = [
  { title: "Visão Geral", group: "", href: "/visao-geral", icon: ChartPie, permission: permissions.dashboardView },
  { title: "Início", group: "", href: "/dashboard", icon: Home, permission: permissions.dashboardView },
  { title: "Chatbot", group: "", href: "/conversas", icon: Bot, permission: permissions.agentsEdit, employeeVisible: true },
  { title: "Leads", group: "", href: "/leads", icon: Users, permission: permissions.leadsView },
  { title: "Conversas", group: "Envio em Massa", href: "/envio-em-massa/conversas", icon: MessageCircleMore, permission: permissions.agentsEdit },
  { title: "Disparos", group: "Envio em Massa", href: "/envio-em-massa", icon: Megaphone, permission: permissions.agentsEdit },
  { title: "Histórico", group: "Envio em Massa", href: "/envio-em-massa/historico", icon: History, permission: permissions.agentsEdit },
  { title: "Contas", group: "Gestão", href: "/envio-em-massa/configuracoes", icon: Smartphone, permission: permissions.agentsEdit },
  { title: "Despesas", group: "Gestão", href: "/despesas", icon: ReceiptText, permission: permissions.expensesView },
  { title: "Compromissos", group: "Gestão", href: "/compromissos", icon: CalendarCheck, permission: permissions.appointmentsView },
  { title: "Agentes", group: "Funil de Vendas", href: "/n8n/agents", icon: Bot, permission: permissions.agentsEdit },
  { title: "Planos", group: "Funil de Vendas", href: "/n8n/plans", icon: CircleDollarSign, permission: permissions.plansEdit },
  { title: "Fluxo de Mensagens", group: "Funil de Vendas", href: "/n8n/flow", icon: Workflow, permission: permissions.agentsEdit },
  { title: "OpenAI", group: "Funil de Vendas", href: "/n8n/openai", icon: BrainCircuit, permission: permissions.openAiEdit },
  { title: "Usuários", group: "Administração", href: "/usuarios", icon: Users, permission: permissions.usersEdit, adminOnly: true },
  { title: "Cobertura", group: "Administração", href: "/ceps", icon: MapPinned, permission: permissions.cepsView },
  { title: "Configurações", group: "Administração", href: "/configuracoes", icon: Settings, permission: permissions.settingsView, employeeVisible: true },
] as const;

export const navigationGroups = ["", "Envio em Massa", "Gestão", "Funil de Vendas", "Administração"] as const;

export function canAccessPage(user: { role: string; permissions?: unknown } | null | undefined, item: (typeof navigationItems)[number]) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if ("adminOnly" in item) return false;
  const grants = (user.permissions ?? {}) as Record<string, boolean>;
  const key = `page:${item.href}`;
  if (Object.prototype.hasOwnProperty.call(grants, key)) return grants[key] === true;
  return "employeeVisible" in item || Boolean(grants[item.permission]);
}
