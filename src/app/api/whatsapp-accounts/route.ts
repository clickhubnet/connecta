import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth-context";
import { authErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { canAccessPage, navigationItems } from "@/config/navigation";
import { ACCOUNT_PREFIX, accountSchema, listAccounts, saveAccount } from "@/modules/contas/accounts";

async function authorize() {
  const user = await requireCurrentUser();
  const page = navigationItems.find(item => item.href === "/envio-em-massa/configuracoes")!;
  if (!canAccessPage(user, page)) throw new Error("FORBIDDEN");
}
function failure(error: unknown) {
  const auth = authErrorResponse(error);
  if (auth) return auth;
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    INVALID_ACCOUNT: "Conta não encontrada.",
    IMMUTABLE_NUMBER: "Para trocar o Phone Number ID, cadastre outra conta.",
    DUPLICATE_ACCOUNT: "Este Phone Number ID já está cadastrado.",
    MISSING_TOKENS: "Informe o Access Token e o Verify Token.",
  };
  return NextResponse.json({ message: messages[code] || "Não foi possível atualizar as contas." }, { status: messages[code] ? 400 : 500 });
}
export async function GET() {
  try {
    await authorize();
    return NextResponse.json({ data: await listAccounts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    await authorize();
    const body = await request.json();
    const parsed = accountSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Confira os dados da conta, telefone e IDs numéricos." }, { status: 400 });
    if (body.importLegacy === true) {
      const existing = (await listAccounts()).find(account => account.phoneNumberId === parsed.data.phoneNumberId);
      if (existing) return NextResponse.json({ data: existing });
    }
    const id = typeof body.id === "string" ? body.id : undefined;
    const account = await saveAccount(parsed.data, id);
    return NextResponse.json({ data: account });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    await authorize();
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^\d+$/.test(id)) throw new Error("INVALID_ACCOUNT");
    await prisma.appSetting.deleteMany({ where: { key: ACCOUNT_PREFIX + id } });
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
