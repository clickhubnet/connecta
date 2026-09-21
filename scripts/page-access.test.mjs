import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPage, navigationItems } from "../src/config/navigation.ts";
const page = (path) => navigationItems.find((item) => item.href === path);
test("administrador acessa todas as abas", () => {
  for (const item of navigationItems) assert.equal(canAccessPage({ role: "ADMIN", permissions: {} }, item), true);
});
test("abas com permissão legada compartilhada podem ser separadas", () => {
  const user = { role: "EMPLOYEE", permissions: { "agents:edit": true, "page:/n8n/agents": false, "page:/n8n/flow": true } };
  assert.equal(canAccessPage(user, page("/n8n/agents")), false);
  assert.equal(canAccessPage(user, page("/n8n/flow")), true);
});
test("negação explícita oculta abas antes sempre visíveis", () => {
  const user = { role: "EMPLOYEE", permissions: { "page:/conversas": false, "page:/configuracoes": false } };
  assert.equal(canAccessPage(user, page("/conversas")), false);
  assert.equal(canAccessPage(user, page("/configuracoes")), false);
});
test("compatibilidade com usuários existentes e restrição administrativa", () => {
  assert.equal(canAccessPage({ role: "EMPLOYEE", permissions: { "leads:view": true } }, page("/leads")), true);
  assert.equal(canAccessPage({ role: "EMPLOYEE", permissions: { "page:/usuarios": true } }, page("/usuarios")), false);
  assert.equal(canAccessPage(null, page("/dashboard")), false);
});
