import { Prisma } from "@prisma/client";

// Campaign sends are not an operator response. Reading never changes this count.
export function pendingRepliesQuery(user: { id: string; role: string }, ids?: string[]) {
  return Prisma.sql`
    SELECT c.id, COUNT(m.id)::int AS count
    FROM "ChatConversation" c
    JOIN "ChatMessage" m ON m."conversationId" = c.id AND m.direction = 'inbound'
    LEFT JOIN LATERAL (
      SELECT MAX(
        CASE WHEN r."rawPayload"->>'kind' IN ('manual-dispatch-text', 'manual-dispatch-media')
          THEN COALESCE((r."rawPayload"->>'replyThrough')::timestamp, r."createdAt")
          ELSE r."createdAt"
        END
      ) AS through
      FROM "ChatMessage" r
      WHERE r."conversationId" = c.id AND r.direction = 'outbound'
        AND r."sentAt" IS NOT NULL
        AND COALESCE(r."rawPayload"->>'kind', '') <> 'mass-dispatch'
    ) reply ON true
    WHERE c."deletedAt" IS NULL AND c.memory->>'source' = 'mass-message'
      AND (${user.role === "ADMIN"} OR c."ownerUserId" = ${user.id}::uuid)
      ${ids ? (ids.length ? Prisma.sql`AND c.id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})` : Prisma.sql`AND false`) : Prisma.empty}
      AND (reply.through IS NULL OR m."createdAt" > reply.through)
    GROUP BY c.id
  `;
}
