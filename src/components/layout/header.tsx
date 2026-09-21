"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { navigationItems } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { clearCurrentUserCache, useCurrentUser } from "@/hooks/use-current-user";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const PageIcon = navigationItems.find((item) => item.href === pathname)?.icon;
  const currentUser = useCurrentUser();
  const { data: user } = currentUser;
  const isDark = theme === "dark";
  const appliedPreference = useRef<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    const updateGreeting = () => setGreeting(new Date().getHours() < 12 ? "Bom dia" : "Boa tarde");
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    const preference = `${user.id}:${user.theme}`;
    if (appliedPreference.current === preference) return;
    appliedPreference.current = preference;
    setTheme(user.theme === "dark" ? "dark" : "light");
  }, [setTheme, user?.id, user?.theme]);

  async function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    if (user?.id === "visual-preview") return;
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme }),
    });
    await currentUser.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearCurrentUserCache();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {PageIcon ? <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-border/70 bg-background text-primary md:grid"><PageIcon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" /></span> : null}
          <div className="min-w-0">
            {isDashboard ? <h1 className="text-sm font-semibold leading-snug tracking-tight sm:text-base">
              <span className="block truncate">{greeting || "Olá"}{user?.name ? ` ${user.name}` : ""},</span>
              <span className="block text-xs font-normal text-muted-foreground">bem-vindo(a) de volta!</span>
            </h1> : <>
              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Central de gestão</p>
              <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
            </>}
            {user?.id === "visual-preview" ? <p className="mt-1 text-[10px] font-medium text-primary">Prévia local · dados demonstrativos</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="rounded-xl text-muted-foreground"
            aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={() => void toggleTheme()}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <span aria-hidden="true" className="h-7 w-px bg-border" />
          <Link href="/configuracoes" aria-label="Abrir perfil e configurações" className="flex min-w-0 items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-accent">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (user?.name ?? "A").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
            <span className="hidden min-w-0 sm:block"><span className="block max-w-36 truncate text-xs font-semibold">{user?.name ?? "Sua conta"}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{user?.title || (user?.role === "ADMIN" ? "Administrador" : "Funcionário")}</span></span>
          </Link>
          <Button variant="ghost" size="icon" type="button" className="rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950" aria-label="Sair da conta" title="Sair da conta" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>
    </header>
  );
}
