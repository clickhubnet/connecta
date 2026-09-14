"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navigationItems } from "@/config/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";

const sections = [
  { title: "Inteligência comercial", paths: ["/dashboard", "/visao-geral"] },
  { title: "Relacionamento & vendas", paths: ["/conversas", "/envio-em-massa", "/leads", "/compromissos", "/despesas", "/sdr-por-voz"] },
  { title: "Gestão do workspace", paths: ["/n8n", "/usuarios", "/ceps", "/configuracoes"] },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const visibleItems = navigationItems.filter(
    (item) => user?.role === "ADMIN" || ("employeeVisible" in item) || (!("adminOnly" in item) && Boolean(user?.permissions?.[item.permission])),
  );

  return (
    <aside className="crm-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 text-white md:block">
      <div className="flex h-full flex-col">
        <button type="button" onClick={onToggle} aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expandir sidebar" : "Recolher sidebar"} className="mx-4 mt-4 flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 text-xs text-red-50 transition-colors hover:bg-white/10">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /><span>Recolher menu</span></>}</button>
        <nav aria-label="Navegação principal" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {sections.map((section) => {
            const items = visibleItems.filter((item) => section.paths.includes(item.href));
            if (!items.length) return null;
            return <div key={section.title}>
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.16em] text-red-100/70">{section.title}</p>
              <div className="space-y-1">{items.map((item) => {
                const active = pathname === item.href;
                const disabled = "comingSoon" in item && item.comingSoon;
                const content = <>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "bg-white/20 text-white" : "bg-white/5 text-red-50/80"}`}><item.icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 leading-snug">{item.title}</span>
                  {disabled ? <span className="whitespace-nowrap rounded-full border border-white/15 px-1.5 py-0.5 text-[8px]">Em breve</span> : null}
                  {"badgeLabel" in item ? <span className="rounded-full bg-red-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-red-100">{item.badgeLabel}</span> : null}
                  {active ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-red-50" /> : null}
                </>;
                const className = `relative flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[12px] font-medium transition-colors ${disabled ? "border-transparent text-red-50/45" : active ? "border-red-200/30 bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg shadow-black/25" : "border-transparent text-red-50/85 hover:border-white/10 hover:bg-white/5 hover:text-white"}`;
                return disabled ? <div key={item.href} aria-disabled="true" aria-label={`${item.title} · Em breve`} title={`${item.title} · Em breve`} className={className}>{content}</div> : <Link key={item.href} href={item.href} title={item.title} aria-label={item.title} aria-current={active ? "page" : undefined} className={className}>{content}</Link>;
              })}</div>
            </div>;
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 bg-black/10 p-4">
          <Link href="/configuracoes" aria-label="Perfil e configurações" title="Perfil e configurações" className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-red-200/30 bg-red-600/20 text-xs font-bold text-red-50">{user?.name?.slice(0, 1) ?? "C"}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user?.name ?? "Usuário"}</span><span className="text-[10px] text-red-50/70">{user?.role === "ADMIN" ? "Administrador" : "Operador"}</span></span>
            <ArrowUpRight className="h-4 w-4 text-red-50/70" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
