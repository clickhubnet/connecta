"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, KeyRound, Moon, Save, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/config/app";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ApiResult } from "@/types/api";

export function SettingsPanel() {
  const user = useCurrentUser();
  const { setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">("light");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const themeChangedByUser = useRef(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function savePhoto(remove = false) {
    if (!remove && !photo) return;
    setPhotoSaving(true); setPhotoMessage("");
    try {
      const body = new FormData();
      if (photo) body.append("file", photo);
      const response = await fetch("/api/profile/avatar", { method: remove ? "DELETE" : "POST", ...(remove ? {} : { body }) });
      const result = await response.json();
      setPhotoMessage(result.message);
      if (response.ok) {
        await user.refresh();
        setPhoto(null);
        if (photoInput.current) photoInput.current.value = "";
      }
    } catch { setPhotoMessage("Não foi possível salvar a foto. Tente novamente."); }
    finally { setPhotoSaving(false); }
  }
  const isAdmin = user.data?.role === "ADMIN";

  useEffect(() => {
    if (!themeChangedByUser.current && (user.data?.theme === "dark" || user.data?.theme === "light")) {
      setSelectedTheme(user.data.theme);
      setTheme(user.data.theme);
    }
  }, [setTheme, user.data?.theme]);

  async function changeTheme(nextTheme: "light" | "dark") {
    if (!user.data) return;
    themeChangedByUser.current = true;
    setSelectedTheme(nextTheme);
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setProfileMessage("Salvando preferência de tema...");
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        user.data.role === "ADMIN"
          ? { name: user.data.name, email: user.data.email, theme: nextTheme }
          : { theme: nextTheme },
      ),
    });
    const result = (await response.json()) as ApiResult<unknown>;
    setProfileMessage(result.message);
    if (response.ok) await user.refresh();
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setProfileMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), theme: selectedTheme }) });
    const result = (await response.json()) as ApiResult<unknown>;
    setProfileMessage(result.message); setSaving(false);
    if (response.ok) await user.refresh();
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setPasswordMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmPassword")) { setPasswordMessage("A confirmação da nova senha não confere."); setSaving(false); return; }
    const response = await fetch("/api/profile/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }) });
    const result = (await response.json()) as ApiResult<unknown>;
    setPasswordMessage(result.message); setSaving(false); if (response.ok) form.reset();
  }

  return <div className="management-page settings-page space-y-5">
    <div className="management-toolbar flex items-center gap-3"><span className="management-heading-icon"><UserRound className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Preferências da conta</h2><p className="mt-1 text-xs text-muted-foreground">Seu perfil, sua aparência e a segurança do seu acesso.</p></div></div>
    {user.error && <p role="alert" className="text-sm text-destructive">{user.error}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="management-surface"><CardHeader><CardTitle className="flex items-center gap-3 text-sm"><span className="management-heading-icon"><UserRound className="h-5 w-5" /></span>Meu perfil</CardTitle><CardDescription className="text-xs">Informações utilizadas para identificar sua conta.</CardDescription></CardHeader><CardContent>
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border bg-muted/20 p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border bg-card">{preview || user.data?.avatarUrl ? <img src={preview || user.data?.avatarUrl || ""} alt="Foto de perfil" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-muted-foreground" />}</div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Foto do perfil</p><p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP · Até 5 MB · Recorte central</p>
              <input ref={photoInput} aria-label="Selecionar foto de perfil" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoSaving} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setPhotoMessage("Escolha uma imagem JPG, PNG ou WebP de até 5 MB."); event.target.value = ""; return; } setPhoto(file); setPhotoMessage(""); }} />
              <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={photoSaving} onClick={() => photoInput.current?.click()}>Escolher foto</Button>{photo && <><Button type="button" size="sm" disabled={photoSaving} onClick={() => void savePhoto()}>{photoSaving ? "Salvando..." : "Salvar foto"}</Button><Button type="button" size="sm" variant="ghost" disabled={photoSaving} onClick={() => { setPhoto(null); if (photoInput.current) photoInput.current.value = ""; }}>Cancelar</Button></>}{user.data?.avatarUrl && !photo && <Button type="button" size="sm" variant="ghost" disabled={photoSaving} onClick={() => void savePhoto(true)}>Remover foto</Button>}</div>
              {photoMessage && <p role="status" className="mt-2 text-xs text-muted-foreground">{photoMessage}</p>}
            </div>
          </div>
          {isAdmin ? <form key={`${user.data?.name}-${user.data?.email}`} className="space-y-4" onSubmit={saveProfile}>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-medium">Nome completo<Input name="name" defaultValue={user.data?.name ?? ""} autoComplete="name" required /></label><label className="grid gap-2 text-xs font-medium">E-mail de acesso<Input name="email" type="email" autoComplete="email" defaultValue={user.data?.email ?? ""} required /></label></div>
            <div className="flex justify-end border-t pt-4"><Button disabled={saving || user.loading}><Save className="h-4 w-4" />Salvar perfil</Button></div>
          </form> : <div className="grid gap-4 sm:grid-cols-2"><Info label="Nome completo" value={user.data?.name ?? "Carregando..."} /><Info label="E-mail de acesso" value={user.data?.email ?? "Carregando..."} /></div>}
          {profileMessage && <p role="status" className="mt-4 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{profileMessage}</p>}
        </CardContent></Card>
        <Card className="management-surface"><CardHeader><CardTitle className="flex items-center gap-3 text-sm"><span className="management-heading-icon"><Sun className="h-5 w-5" /></span>Aparência</CardTitle><CardDescription className="text-xs">Escolha como prefere visualizar a plataforma.</CardDescription></CardHeader><CardContent>
          <div className="grid grid-cols-2 gap-4"><ThemeOption label="Claro" icon={<Sun className="h-4 w-4" />} selected={selectedTheme === "light"} onClick={() => void changeTheme("light")} /><ThemeOption label="Escuro" icon={<Moon className="h-4 w-4" />} selected={selectedTheme === "dark"} onClick={() => void changeTheme("dark")} /></div><p className="mt-3 text-xs text-muted-foreground">Sua preferência é aplicada e salva automaticamente.</p>
        </CardContent></Card>
        <Card className="management-surface"><CardHeader><CardTitle className="flex items-center gap-3 text-sm"><span className="management-heading-icon"><KeyRound className="h-5 w-5" /></span>Segurança</CardTitle><CardDescription className="text-xs">Atualize sua senha com pelo menos oito caracteres.</CardDescription></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={changePassword}>
            <label className="grid gap-2 text-xs font-medium">Senha atual<Input name="currentPassword" type="password" autoComplete="current-password" placeholder="Digite sua senha atual" required /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-medium">Nova senha<Input name="newPassword" type="password" autoComplete="new-password" minLength={8} placeholder="No mínimo 8 caracteres" required /></label><label className="grid gap-2 text-xs font-medium">Confirmar nova senha<Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} placeholder="Repita a nova senha" required /></label></div>
            {passwordMessage && <p role="status" className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{passwordMessage}</p>}
            <div className="flex justify-end border-t pt-4"><Button disabled={saving || user.loading}><ShieldCheck className="h-4 w-4" />Atualizar senha</Button></div>
          </form>
        </CardContent></Card>
      </div>
      <aside className="space-y-5">
        <Card className="management-surface sales-profile"><CardContent className="p-6"><span className="sales-avatar overflow-hidden">{user.data?.avatarUrl ? <img src={user.data.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><h2 className="mt-4 break-words text-base font-semibold">{user.data?.name ?? "Carregando..."}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{user.data?.email}</p><div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs font-medium"><ShieldCheck className="h-4 w-4 text-primary" />{user.loading ? "Carregando perfil..." : user.data?.title || (isAdmin ? "Administrador" : "Funcionário")}</div></CardContent></Card>
        {isAdmin && <Card className="management-surface"><CardHeader><CardTitle className="text-sm">Sobre a plataforma</CardTitle><CardDescription className="text-xs">Informações desta instalação.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex min-h-24 items-center justify-center rounded-xl border bg-white p-5"><img src="/brand/logosem-transparente.png" alt="Connecta Telecom" className="block h-auto w-full max-w-56 object-contain" /></div><div className="grid gap-3"><Info label="Versão" value={appConfig.version} /><Info label="Licença" value={appConfig.license} /></div></CardContent></Card>}
      </aside>
    </div>
  </div>;
}

function ThemeOption({ label, icon, selected, onClick }: { label: string; icon: React.ReactNode; selected: boolean; onClick: () => void }) {
  const dark = label === "Escuro";
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`overflow-hidden rounded-xl border p-3 text-left transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/15" : "bg-card hover:border-primary/30"}`}>
    <div aria-hidden="true" className={`mb-3 flex h-20 gap-2 overflow-hidden rounded-lg border p-2 ${dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50"}`}><div className="w-1/5 rounded bg-gradient-to-b from-red-600 to-red-950" /><div className="flex-1 space-y-2"><div className={`h-3 rounded ${dark ? "bg-slate-700" : "bg-white"}`} /><div className="grid h-10 grid-cols-2 gap-2"><div className={`rounded ${dark ? "bg-slate-800" : "bg-white"}`} /><div className={`rounded ${dark ? "bg-slate-800" : "bg-white"}`} /></div></div></div>
    <span className="flex items-center gap-2 text-xs font-semibold">{icon}{label}{selected && <Check className="ml-auto h-4 w-4 text-primary" />}</span>
  </button>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/60 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>; }
