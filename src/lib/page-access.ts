import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-context";
import { canAccessPage, navigationItems } from "@/config/navigation";

export async function requirePageAccess(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const item = navigationItems.find((entry) => entry.href === path);
  if (item && !canAccessPage(user, item)) redirect("/acesso-negado");
}
