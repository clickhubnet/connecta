import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-context";
import { canAccessPage, navigationItems } from "@/config/navigation";

export default async function N8NPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const first = navigationItems.find((item) => item.href.startsWith("/n8n/") && canAccessPage(user, item));
  redirect(first?.href ?? "/acesso-negado");
}
