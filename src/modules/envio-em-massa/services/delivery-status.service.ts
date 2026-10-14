import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishConversationEvent } from "@/server/realtime/conversation-events";

const statusSchema = z.object({
  id: z.string().min(1).max(512), status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string().regex(/^\d{1,11}$/), errors: z.array(z.object({ code: z.number().int() })).optional(),
});

export async function recordDeliveryStatuses(payload: { entry?: Array<{ changes?: Array<{ field?: string; value?: { statuses?: unknown[] } }> }> }) {
  let recorded = 0;
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.field !== "messages") continue;
    for (const raw of change.value?.statuses ?? []) {
      const parsed = statusSchema.safeParse(raw);
      if (!parsed.success) continue;
      const item = parsed.data;
      const at = new Date(Number(item.timestamp) * 1000).toISOString();
      // Separate records preserve delivery/read evidence even when notifications arrive out of order.
      const key = `private:dispatch-status:${item.id}:${item.status}`;
      const value = { providerMessageId: item.id, status: item.status, at, ...(item.errors?.[0] ? { errorCode: item.errors[0].code } : {}) };
      await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: {} });
      recorded++;
    }
  }
  if (recorded) await publishConversationEvent({ type: "dispatch_status_updated" });
  return recorded;
}
