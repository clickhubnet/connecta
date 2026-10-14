import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { applyDeliveryEvents, failureExplanation } from "../src/modules/envio-em-massa/delivery-status";
import * as schema from "../src/modules/envio-em-massa/schemas/mass-message.schema";
import * as templates from "../src/services/meta/template";
import * as meta from "../src/services/meta/meta.service";

const require = createRequire(import.meta.url);
function moduleAt(path: string, mocks: Record<string, unknown>) {
  const ctx = vm.createContext({ exports: {}, URL, Request, console, Date, require: (name: string) => mocks[name] ?? require(name) });
  vm.runInContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return ctx.exports;
}
async function main() {
  const contact = { phone: "5511999999999", status: "accepted" as const, detail: "", providerMessageId: "wamid.test" };
  const events = [
    { providerMessageId: "wamid.test", status: "read" as const, at: "2026-10-14T13:02:00.000Z" },
    { providerMessageId: "wamid.test", status: "sent" as const, at: "2026-10-14T13:00:00.000Z" },
    { providerMessageId: "wamid.test", status: "delivered" as const, at: "2026-10-14T13:01:00.000Z" },
  ];
  const read = applyDeliveryEvents(contact, events);
  assert.equal(read.status, "read");
  assert.equal(read.whatsapp, "confirmed");
  assert.equal(read.sentAt, events[1].at);
  assert.equal(read.deliveredAt, events[2].at);
  assert.equal(applyDeliveryEvents(contact, []).whatsapp, "unknown");
  assert.equal(applyDeliveryEvents(contact, [events[1]]).whatsapp, "unknown");
  assert.equal(applyDeliveryEvents(contact, [], true).whatsapp, "confirmed");
  const failed = applyDeliveryEvents(contact, [{ providerMessageId: "wamid.test", status: "failed", at: events[0].at, errorCode: 131026 }]);
  assert.equal(failed.status, "failed");
  assert.equal(failed.whatsapp, "unknown");
  assert.match(failed.detail, /não confirma/);
  assert.equal(applyDeliveryEvents(contact, [{ ...events[0], providerMessageId: "another" }]).status, "accepted");
  assert.match(failureExplanation(undefined, "Meta (131047): English details"), /24 horas/);
  assert.doesNotMatch(failureExplanation(999, "OAuthException: SQL secret"), /OAuth|SQL|secret/);

  const records = new Map<string, any>();
  let notifications = 0;
  const delivery = moduleAt("src/modules/envio-em-massa/services/delivery-status.service.ts", {
    "@/lib/prisma": { prisma: { appSetting: { upsert: async ({ where, create }: any) => { if (!records.has(where.key)) records.set(where.key, create); } } } },
    "@/server/realtime/conversation-events": { publishConversationEvent: async () => { notifications++; } },
  });
  const payload = { entry: [{ changes: [{ field: "messages", value: { statuses: events.map(event => ({ id: event.providerMessageId, status: event.status, timestamp: String(Date.parse(event.at) / 1000) })) } }] }] };
  await delivery.recordDeliveryStatuses(payload);
  await delivery.recordDeliveryStatuses(payload);
  assert.equal(records.size, 3, "Duplicate and out-of-order notifications preserve every delivery stage");
  await delivery.recordDeliveryStatuses({ entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: "bad", status: "read", timestamp: "bad" }] } }] }] });
  assert.equal(records.size, 3);
  assert.equal(notifications, 2);

  const saved: any[] = [];
  const serviceModule = moduleAt("src/modules/envio-em-massa/services/mass-message.service.ts", {
    "@/lib/prisma": { prisma: {
      lead: { findFirst: async () => null },
      chatConversation: { findFirst: async () => null, create: async () => ({ id: "conversation" }) },
      chatMessage: { create: async () => ({}) },
      appSetting: { create: async ({ data }: any) => { saved.push(data); } },
    } },
    "@/modules/envio-em-massa/schemas/mass-message.schema": schema,
    "@/services/meta/meta.service": meta,
    "@/services/meta/template": templates,
    "@/server/realtime/conversation-events": { publishConversationEvent: async () => {} },
  });
  const service = new serviceModule.MassMessageService({ sendText: async (phone: string) => {
    if (phone.endsWith("0002")) throw new meta.MetaApiError("Meta (131026): undeliverable", false, 502, 131026);
    if (phone.endsWith("0003")) throw new meta.MetaApiError("Sem confirmação", true);
    return "wamid.new";
  } });
  const result = await service.send({ mode: "text", message: "Mensagem da campanha", contactsText: "551199990001\n551199990002\n551199990003", consentConfirmed: true, isTest: true }, { id: "sender", role: "ADMIN" });
  assert.equal(result.accepted, 1); assert.equal(result.failed, 1); assert.equal(result.uncertain, 1);
  assert.equal(saved[0].value.contacts.length, 3, "Failures and unknown outcomes persist alongside successful sends");
  assert.equal(saved[0].value.contacts[1].errorCode, 131026);
  assert.ok(saved[0].value.contacts.every((item: any) => item.attemptedAt && item.processedAt));
  assert.equal(saved[0].value.isTest, true);
  assert.equal(saved[0].value.message, "Mensagem da campanha");
  const batches = [
    { id: "1", key: "private:dispatch-result:batch-new", createdAt: new Date(), value: { ...saved[0].value, userId: "sender" } },
    { id: "2", key: "private:dispatch-result:batch-old", createdAt: new Date(), value: { userId: "other", total: 5, accepted: 3, failed: 2, uncertain: 0 } },
  ];
  let viewer = { id: "sender", role: "EMPLOYEE" };
  const matchingBatches = (where: any) => batches.filter(batch => !where.value || batch.value.userId === where.value.equals);
  const route = moduleAt("src/app/api/envio-em-massa/historico/route.ts", {
    "@/lib/auth-context": { requireCurrentUser: async () => viewer },
    "@/lib/api-errors": { authErrorResponse: () => null },
    "@/modules/envio-em-massa/delivery-status": { applyDeliveryEvents },
    "@/lib/prisma": { prisma: {
      appSetting: {
        findMany: async ({ where, skip = 0, take = 20 }: any) => where.key.in ? [] : matchingBatches(where).slice(skip, skip + take),
        count: async ({ where }: any) => matchingBatches(where).length,
      },
      chatMessage: { findMany: async () => [] },
      user: { findMany: async () => [{ id: "sender", name: "Pessoa responsável" }] },
    } },
  });
  let page = await (await route.GET(new Request("http://local/api/envio-em-massa/historico"))).json();
  assert.equal(page.data.entries.length, 1, "Employee sees only their campaigns");
  assert.equal(page.data.entries[0].contacts.length, 3);
  viewer = { id: "sender", role: "ADMIN" };
  page = await (await route.GET(new Request("http://local/api/envio-em-massa/historico"))).json();
  assert.equal(page.data.entries.length, 2);
  assert.equal(page.data.entries[1].missingContacts, 5, "Old missing details are reported, never fabricated");
  assert.equal(page.data.entries[1].failed, 2);
  page = await (await route.GET(new Request("http://local/api/envio-em-massa/historico?offset=20"))).json();
  assert.equal(page.data.entries.length, 0);
  assert.equal(page.data.hasMore, false);
  console.log("PASS status chronology, WhatsApp evidence, Portuguese failure explanations, repeated notifications and persistent per-contact results without real sends");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
