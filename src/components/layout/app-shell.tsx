"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { CurrentUserProvider } from "@/hooks/use-current-user";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isDispatch = pathname === "/envio-em-massa";
  const isMassAccounts = pathname === "/envio-em-massa/configuracoes";
  const isFullViewport = isDispatch || isMassAccounts;
  const isInbox = pathname === "/conversas" || pathname === "/envio-em-massa/conversas";
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("connecta-sidebar-collapsed") === "1"); } catch {}
  }, []);
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("connecta-sidebar-collapsed", next ? "1" : "0"); } catch {}
  }
  return (
    <CurrentUserProvider>
      <div className={`crm-surface bg-background ${isFullViewport ? "h-dvh overflow-hidden" : "min-h-screen"}`} data-sidebar-collapsed={collapsed}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <div className={`${isFullViewport ? "dispatch-shell flex h-full min-h-0 flex-col" : "min-h-screen"} ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
          <Header title={title} />
          <main className={isFullViewport ? "dispatch-main min-h-0 flex-1 overflow-hidden p-3 sm:p-4" : isInbox ? "w-full p-2 sm:p-3" : "crm-main mx-auto w-full max-w-[1600px] px-4 py-6 pb-28 sm:px-6 md:pb-8 lg:px-8"}>
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </CurrentUserProvider>
  );
}
