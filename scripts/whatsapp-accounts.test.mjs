import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
const records = new Map();
const prisma = {
  appSetting: {
    findUnique: async ({ where }) => records.get(where.key),
    findMany: async () => [...records.values()],
    upsert: async ({ where, create, update }) => {
      const record = records.has(where.key) ? { ...records.get(where.key), ...update } : create;
      records.set(where.key, record);
      return record;
    },
  },
  agent: { findMany: async () => [] },
};
const env = { JWT_SECRET: "test-only-key", META_WHATSAPP_PHONE_NUMBER_ID: "123456", META_WHATSAPP_ACCESS_TOKEN: "private-env-token", META_GRAPH_API_VERSION: "v26.0" };
const context = vm.createContext({
  exports: {}, Buffer, AbortSignal, process: { env },
  require: name => name === "@/lib/prisma" ? { prisma } : require(name),
  fetch: async () => ({ ok: true, json: async () => ({ display_phone_number: "+55 11 97788-8846", verified_name: "Connecta" }) }),
});
vm.runInContext(ts.transpileModule(readFileSync("src/modules/contas/accounts.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { saveAccount, listAccounts, accountSchema } = context.exports;
const input = { name: "Chatbot", phone: "5511999999999", phoneNumberId: "789", wabaId: "987", apiVersion: "v26.0", purpose: "CHATBOT", accessToken: "private-token", verifyToken: "private-verify" };
assert.ok(accountSchema.safeParse(input).success);
assert.equal(accountSchema.safeParse({ ...input, phone: "a" }).success, false);
const saved = await saveAccount(input);
assert.equal(saved.purpose, "CHATBOT");
assert.equal(saved.accessToken, undefined);
assert.equal(saved.verifyToken, undefined);
assert.ok(!JSON.stringify([...records.values()]).includes("private-token"));
assert.ok(!JSON.stringify([...records.values()]).includes("private-verify"));
await assert.rejects(saveAccount(input), /DUPLICATE_ACCOUNT/);
await assert.rejects(saveAccount({ ...input, phoneNumberId: "123456" }), /DUPLICATE_ACCOUNT/);
await saveAccount({ ...input, accessToken: "", verifyToken: "", name: "Updated" }, "789");
await assert.rejects(saveAccount({ ...input, phoneNumberId: "111" }, "789"), /IMMUTABLE_NUMBER/);
await assert.rejects(saveAccount({ ...input, accessToken: "", phoneNumberId: "222" }), /MISSING_TOKENS/);
const list = await listAccounts();
assert.equal(list.length, 2);
assert.equal(list[0].source, "environment");
assert.equal(list[0].phone, "+55 11 97788-8846");
assert.equal(list[1].name, "Updated");
assert.ok(!JSON.stringify(list).includes("private-"));
console.log("PASS account validation, encrypted persistence, updates, duplicates, environment visibility and secret redaction");
