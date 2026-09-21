"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, Settings2 } from "lucide-react";
import { navigationItems, navigationGroups, canAccessPage } from "@/config/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const visibleItems = navigationItems.filter(
    (item) => canAccessPage(user, item),
  );
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";

  return (
    <aside aria-label="Menu lateral" className={`crm-sidebar fixed inset-y-0 left-0 z-40 hidden text-white md:flex ${collapsed ? "w-20" : "w-64"}`}>
      <div className="relative flex h-full w-full flex-col">
        <div className={`flex h-20 shrink-0 items-center border-b border-white/15 ${collapsed ? "justify-center px-3" : "justify-between px-6"}`}>
          {!collapsed && <div><p className="text-sm font-semibold tracking-tight">Central de gestão</p><p className="mt-1 text-[10px] text-white/70">Seu negócio, em sintonia.</p></div>}
          <button type="button" onClick={onToggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} aria-expanded={!collapsed} title={collapsed ? "Expandir menu" : "Recolher menu"} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 text-white/85 transition-colors hover:bg-white/15 focus-visible:outline-white">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav aria-label="Navegação principal" className={`min-h-0 flex-1 overflow-y-auto py-5 ${collapsed ? "px-3" : "px-4"}`}>
          {navigationGroups.map((section, index) => {
            const items = visibleItems.filter((item) => item.group === section);
            if (!items.length) return null;
            return <div key={section} className={index ? "mt-5 border-t border-white/15 pt-5" : ""}>
              {!collapsed && section && <p className="mb-2.5 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/65">{section}</p>}
              <div className="space-y-1">{items.map((item) => {
                const active = pathname === item.href;
                const disabled = "comingSoon" in item && item.comingSoon;
                const content = <>
                  <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.7} aria-hidden="true" />
                  {!collapsed && <>
                    <span className="min-w-0 flex-1 text-[12px] leading-snug">{item.title}</span>
                    {disabled ? <span className="text-[8px] font-medium uppercase tracking-wide">Em breve</span> : null}
                    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </>}
                </>;
                const className = `sidebar-link flex min-h-11 items-center gap-3 rounded-xl ${collapsed ? "justify-center px-0" : "px-3"} ${disabled ? "cursor-default text-white/50" : active ? "bg-white font-semibold text-[#ba141b] shadow-[0_4px_16px_rgba(80,0,15,0.16)]" : "text-white/90 hover:bg-white/10 hover:text-white"}`;
                return disabled ? <div key={item.href} aria-disabled="true" aria-label={`${item.title} · Em breve`} title={`${item.title} · Em breve`} className={className}>{content}</div> : <Link key={item.href} href={item.href} title={item.title} aria-label={item.title} aria-current={active ? "page" : undefined} className={className}>{content}</Link>;
              })}</div>
            </div>;
          })}
        </nav>
        <div className={`shrink-0 border-t border-white/20 py-4 ${collapsed ? "px-3" : "px-4"}`}>
          <Link href="/configuracoes" aria-label="Perfil e configurações" title="Perfil e configurações" className={`flex items-center gap-3 rounded-xl py-2 transition-colors hover:bg-white/10 ${collapsed ? "justify-center" : "px-2"}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/35 bg-white/15 text-xs font-semibold">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}</span>
            {!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user?.name ?? "Sua conta"}</span><span className="mt-1 block text-[10px] text-white/75">{user?.title || (user?.role === "ADMIN" ? "Administrador" : "Funcionário")}</span></span><Settings2 className="h-4 w-4 shrink-0 text-white/80" aria-hidden="true" /></>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
