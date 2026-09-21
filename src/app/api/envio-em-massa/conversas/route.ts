import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth-context";
import { authErrorResponse } from "@/lib/api-errors";
import { successResponse, errorResponse } from "@/lib/api-response";
import { dispatchConversationScope, requireDispatchAdministrator } from "@/modules/envio-em-massa/conversation-access";

const dispatchScope: Prisma.ChatConversationWhereInput = {
  deletedAt: null, memory: { path: ["source"], equals: "mass-message" },
};

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    const search = params.get("search")?.trim() ?? "";
    const where: Prisma.ChatConversationWhereInput = {
      ...dispatchConversationScope(user),
      ...(id ? { id } : {}),
    };
    if (id && !z.string().uuid().safeParse(id).success) return NextResponse.json(errorResponse("Conversa não encontrada."), { status: 404 });
    if (!id) {
      if (search) where.OR = [{ phone: { contains: search } }, { lead: { name: { contains: search, mode: "insensitive" } } }];
      const filter = params.get("filter");
      if (filter === "unread") where.messages = { some: { direction: "inbound", readAt: null } };
      if (filter === "open") where.state = { notIn: ["FINISHED", "BLOCKED"] };
      if (filter === "blocked") where.state = "BLOCKED";
      // The latest message determines whether a reply is still pending.
      if (filter === "unanswered") {
        const pending = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT c.id FROM "ChatConversation" c
          WHERE c."deletedAt" IS NULL AND c.memory->>'source' = 'mass-message'
          AND (${user.role === "ADMIN"} OR c."ownerUserId" = ${user.id}::uuid)
          AND (SELECT m.direction FROM "ChatMessage" m WHERE m."conversationId" = c.id ORDER BY m."createdAt" DESC, m.id DESC LIMIT 1) = 'inbound'
        `);
        where.id = { in: pending.map((row) => row.id) };
      }
    }
    const conversations = await prisma.chatConversation.findMany({
      where, orderBy: { updatedAt: "desc" }, take: id ? 1 : 100,
      select: { id: true, phone: true, ownerUserId: true, state: true, lead: { select: { name: true } }, owner: { select: { name: true } }, messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: id ? 100 : 1, select: { id: true, direction: true, body: true, createdAt: true } } },
    });
    if (id && !conversations.length) return NextResponse.json(errorResponse("Conversa não encontrada."), { status: 404 });
    const employees = user.role === "ADMIN" ? await prisma.user.findMany({ where: { role: "EMPLOYEE", status: "ACTIVE", deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
    return NextResponse.json(successResponse("Conversas consultadas.", { conversations, employees }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json(errorResponse("Não foi possível consultar as conversas."), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    requireDispatchAdministrator(user);
    const body = z.object({ conversationId: z.string().uuid(), ownerUserId: z.string().uuid().nullable() }).safeParse(await request.json());
    if (!body.success) return NextResponse.json(errorResponse("Dados inválidos."), { status: 400 });
    const { conversationId, ownerUserId } = body.data;
    const count = await prisma.$transaction(async (tx) => {
      if (ownerUserId && !await tx.user.findFirst({ where: { id: ownerUserId, role: "EMPLOYEE", status: "ACTIVE", deletedAt: null } })) return -1;
      return (await tx.chatConversation.updateMany({ where: { ...dispatchScope, id: conversationId }, data: { ownerUserId } })).count;
    });
    if (count === -1) return NextResponse.json(errorResponse("Funcionário indisponível."), { status: 400 });
    if (!count) return NextResponse.json(errorResponse("Conversa não encontrada."), { status: 404 });
    return NextResponse.json(successResponse("Responsável atualizado.", null));
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json(errorResponse("Não foi possível atribuir o funcionário."), { status: 500 });
  }
}
