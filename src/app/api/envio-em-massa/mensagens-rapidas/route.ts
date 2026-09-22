import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse } from "@/lib/api-errors";
import { requireCurrentUser } from "@/lib/auth-context";
import { dispatchConversationScope } from "@/modules/envio-em-massa/conversation-access";

const keyPrefix = "private:dispatch-quick-message:";
const messageSchema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(["save", "delete"]),
  id: z.string().uuid(),
  body: z.string().trim().min(1).max(2_000).optional(),
});

type QuickMessage = { id: string; body: string; ownerUserId: string };

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const conversationId = new URL(request.url).searchParams.get("conversationId");
    if (!z.string().uuid().safeParse(conversationId).success) {
      return NextResponse.json({ message: "Conversa inválida." }, { status: 400 });
    }
    const conversation = await prisma.chatConversation.findFirst({
      where: { ...dispatchConversationScope(user), id: conversationId! },
      select: { id: true },
    });
    if (!conversation) return NextResponse.json({ message: "Conversa não encontrada." }, { status: 404 });

    const records = await prisma.appSetting.findMany({
      where: { key: { startsWith: keyPrefix } },
      orderBy: { updatedAt: "desc" },
      select: { value: true },
    });
    const messages = records
      .map((record) => record.value as QuickMessage)
      .filter((message) => message?.id && message?.body && (user.role === "ADMIN" || message.ownerUserId === user.id));
    return NextResponse.json({ data: messages }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ message: "Falha ao consultar mensagens rápidas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const parsed = messageSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Confira a mensagem rápida." }, { status: 400 });
    const { conversationId, action, id, body } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.chatConversation.findFirst({
        where: { ...dispatchConversationScope(user), id: conversationId },
        select: { id: true },
      });
      if (!conversation) return "not-found" as const;

      const key = `${keyPrefix}${id}`;
      const existing = await tx.appSetting.findUnique({ where: { key }, select: { value: true } });
      const ownerUserId = (existing?.value as Partial<QuickMessage> | undefined)?.ownerUserId;
      if (existing && user.role !== "ADMIN" && ownerUserId !== user.id) return "forbidden" as const;

      if (action === "delete") {
        if (!existing) return "not-found" as const;
        await tx.appSetting.delete({ where: { key } });
      } else {
        if (!body) return "invalid" as const;
        await tx.appSetting.upsert({
          where: { key },
          create: { key, value: { id, body, ownerUserId: ownerUserId || user.id } },
          update: { value: { id, body, ownerUserId: ownerUserId || user.id } },
        });
      }
      return "ok" as const;
    });

    if (result !== "ok") {
      const status = result === "forbidden" ? 403 : result === "invalid" ? 400 : 404;
      const message = result === "forbidden" ? "Você pode alterar somente as mensagens rápidas que criou." : "Mensagem ou conversa inválida.";
      return NextResponse.json({ message }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ message: "Não foi possível salvar a mensagem rápida." }, { status: 500 });
  }
}
