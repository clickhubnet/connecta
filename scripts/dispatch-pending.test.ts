import assert from "node:assert/strict";
import { PrismaClient, Prisma } from "@prisma/client";
import { pendingRepliesQuery } from "../src/modules/envio-em-massa/pending-replies";
const db = new PrismaClient();
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000003";
const admin = { id: owner, role: "ADMIN" };
async function main() {
try {
  await db.$transaction(async tx => {
    // Temporary tables shadow production tables only inside this connection.
    await tx.$executeRawUnsafe('CREATE TEMP TABLE "ChatConversation" (id uuid, "deletedAt" timestamp, memory jsonb, "ownerUserId" uuid) ON COMMIT DROP');
    await tx.$executeRawUnsafe('CREATE TEMP TABLE "ChatMessage" (id text, "conversationId" uuid, direction text, "rawPayload" jsonb, "sentAt" timestamp, "createdAt" timestamp, "readAt" timestamp) ON COMMIT DROP');
    await tx.$executeRaw(Prisma.sql`INSERT INTO pg_temp."ChatConversation" VALUES (${id}::uuid, null, '{"source":"mass-message"}', ${owner}::uuid)`);
    let seq = 0;
    async function message(direction: string, time: string, payload: object | null = null, sent = true) {
      await tx.$executeRaw(Prisma.sql`INSERT INTO pg_temp."ChatMessage" VALUES (
        ${String(++seq)}, ${id}::uuid, ${direction}, ${JSON.stringify(payload)}::jsonb,
        ${sent ? time : null}::timestamp, ${time}::timestamp, null)`);
    }
    async function count(user = admin) {
      const rows = await tx.$queryRaw<Array<{ id: string; count: number }>>(pendingRepliesQuery(user, [id]));
      return rows[0]?.count ?? 0;
    }
    assert.equal(await count(), 0);
    await tx.$executeRaw(Prisma.sql`INSERT INTO pg_temp."ChatMessage"
      SELECT 'incoming-' || n, ${id}::uuid, 'inbound', null, null, '2026-09-21T12:00:00Z'::timestamp, null
      FROM generate_series(1, 105) n`);
    assert.equal(await count(), 105);
    await tx.$executeRawUnsafe('UPDATE pg_temp."ChatMessage" SET "readAt" = now()');
    assert.equal(await count(), 105, "Viewing does not clear pending messages");
    await message("outbound", "2026-09-21T12:01:00Z", { kind: "mass-dispatch" });
    assert.equal(await count(), 105, "Campaign is not a response");
    await message("outbound", "2026-09-21T12:02:00Z", { kind: "manual-dispatch-text" }, false);
    assert.equal(await count(), 105, "Unsent message is not a response");
    assert.equal(await count({ id: other, role: "EMPLOYEE" }), 0, "Other employee cannot see pending count");
    assert.equal(await count({ id: owner, role: "EMPLOYEE" }), 105);
    await message("outbound", "2026-09-21T12:03:00Z", { kind: "manual-dispatch-text", replyThrough: "2026-09-21T12:02:59Z" });
    assert.equal(await count(), 0);
    await message("inbound", "2026-09-21T12:04:00Z");
    await message("inbound", "2026-09-21T12:05:00Z");
    await message("outbound", "2026-09-21T12:06:00Z", { kind: "manual-dispatch-media", replyThrough: "2026-09-21T12:04:30Z" });
    assert.equal(await count(), 1, "Inbound received during upload stays pending");
    await message("outbound", "2026-09-21T12:07:00Z", { kind: "manual-dispatch-media" });
    assert.equal(await count(), 0, "Successful audio/media clears count");
    await message("inbound", "2026-09-21T12:08:00Z");
    assert.equal(await count(), 1, "Next inbound starts a new count");
    await tx.$executeRawUnsafe('UPDATE pg_temp."ChatConversation" SET "deletedAt" = now()');
    assert.equal(await count(), 0);
    console.log("PASS pending counts: reading, 105 messages, campaigns, failed sends, text/media replies, concurrent inbound, permissions and deleted conversations");
  }, { timeout: 30000 });
} finally { await db.$disconnect(); }

}
void main().catch(error => { console.error(error); process.exitCode = 1; });
