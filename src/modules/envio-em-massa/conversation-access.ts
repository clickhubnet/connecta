import type { Prisma } from "@prisma/client";

export function dispatchConversationScope(user: { id: string; role: string }): Prisma.ChatConversationWhereInput {
  return {
    deletedAt: null,
    memory: { path: ["source"], equals: "mass-message" },
    ...(user.role === "ADMIN" ? {} : { ownerUserId: user.id }),
  };
}

export function requireDispatchAdministrator(user: { role: string }) {
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
}
