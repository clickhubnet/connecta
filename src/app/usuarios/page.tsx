import { requirePageAccess } from "@/lib/page-access";
import { AppShell } from "@/components/layout/app-shell";
import { UserManagement } from "@/modules/usuarios/components/user-management";

export default async function UsuariosPage() {
  await requirePageAccess("/usuarios");
  return (
    <AppShell title="Usuários">
      <UserManagement />
    </AppShell>
  );
}
