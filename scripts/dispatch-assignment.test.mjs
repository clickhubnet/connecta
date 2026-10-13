import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as access from "../src/modules/envio-em-massa/conversation-access.ts";

const require = createRequire(import.meta.url);
const adminId = "00000000-0000-4000-8000-000000000001";
const employeeId = "00000000-0000-4000-8000-000000000002";
const blockedId = "00000000-0000-4000-8000-000000000003";
const deletedId = "00000000-0000-4000-8000-000000000004";
const conversationId = "00000000-0000-4000-8000-000000000005";
let user = { id: adminId, role: "ADMIN" };
let ownerUserId = null;
let updates = 0;
const conversations = Array.from({ length: 250 }, (_, index) => ({ id: String(index), memory: {}, ownerUserId: null }));
const users = [
  { id: adminId, name: "Administrador", role: "ADMIN", status: "ACTIVE", deletedAt: null },
  { id: employeeId, name: "Funcionário", role: "EMPLOYEE", status: "ACTIVE", deletedAt: null },
  { id: blockedId, name: "Bloqueado", role: "EMPLOYEE", status: "BLOCKED", deletedAt: null },
  { id: deletedId, name: "Excluído", role: "ADMIN", status: "ACTIVE", deletedAt: new Date() },
];
const matches = (where, item) => Object.entries(where).every(([key, value]) =>
  value && typeof value === "object" && "in" in value ? value.in.includes(item[key]) : item[key] === value);
const tx = {
  user: {
    findMany: async ({ where }) => users.filter(item => matches(where, item)),
    findFirst: async ({ where }) => users.find(item => matches(where, item)) ?? null,
  },
  chatConversation: {
    findMany: async ({ take }) => conversations.slice(0, take),
    count: async () => conversations.length,
    updateMany: async ({ data }) => { ownerUserId = data.ownerUserId; updates++; return { count: 1 }; },
  },
  appSetting: { findMany: async () => [] },
  $queryRaw: async () => [],
};
const mocks = {
  "@/lib/prisma": { prisma: { ...tx, $transaction: async fn => fn(tx) } },
  "@/lib/auth-context": { requireCurrentUser: async () => user },
  "@/lib/api-errors": { authErrorResponse: error => error.message === "FORBIDDEN" ? new Response(null, { status: 403 }) : null },
  "@/modules/envio-em-massa/conversation-access": access,
  "@/server/realtime/conversation-events": { publishConversationEvent: async () => {} },
  "@/modules/envio-em-massa/pending-replies": { pendingRepliesQuery: () => null },
  "@/lib/audio/mp3": { isMp3Audio: () => true },
  "@/services/meta/meta-whatsapp.service": { MetaWhatsappService: class {} },
  "@/services/meta/meta.service": { MetaApiError: class extends Error {} },
};
const ctx = vm.createContext({ exports: {}, URL, Request, console, require: name => mocks[name] ?? require(name) });
vm.runInContext(ts.transpileModule(readFileSync("src/app/api/envio-em-massa/conversas/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, ctx);
const response = await ctx.exports.GET(new Request("http://local/api/envio-em-massa/conversas"));
assert.equal(response.status, 200);
const initial = (await response.json()).data;
assert.deepEqual(initial.employees.map(item => item.id), [adminId, employeeId]);
assert.equal(initial.conversations.length, 100);
assert.equal(initial.total, 250);
assert.equal(initial.hasMore, true);
const olderResponse = await ctx.exports.GET(new Request("http://local/api/envio-em-massa/conversas?limit=300"));
const older = (await olderResponse.json()).data;
assert.equal(older.conversations.length, 250);
assert.equal(older.conversations.at(-1).id, "249", "Old conversations remain accessible beyond the first 100");
assert.equal(older.hasMore, false);
async function assign(id) {
  return ctx.exports.PATCH(new Request("http://local", { method: "PATCH", body: JSON.stringify({ conversationId, ownerUserId: id }) }));
}
for (const id of [adminId, employeeId, null]) {
  assert.equal((await assign(id)).status, 200);
  assert.equal(ownerUserId, id);
}
for (const id of [blockedId, deletedId]) assert.equal((await assign(id)).status, 400);
user = { id: employeeId, role: "EMPLOYEE" };
assert.equal((await assign(adminId)).status, 403);
assert.equal(updates, 3, "Blocked, deleted and unauthorized assignments cannot update the conversation");
console.log("PASS active administrator/employee listing and assignment, removal, blocked/deleted rejection and admin-only access");
