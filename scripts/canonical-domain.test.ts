import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { metaWebhookUrl } from "../src/lib/site-config";

async function main() {
  for (const host of ["connecta-phi.vercel.app", "connectacorpcrm.com.br"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await middleware(new NextRequest(`https://${host}/leads?search=Maria`, { method }));
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), "https://www.connectacorpcrm.com.br/leads?search=Maria");
    }
  }
  for (const method of ["GET", "POST"]) {
    const response = await middleware(new NextRequest(`${metaWebhookUrl}?hub.challenge=123`, { method }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
  for (const host of ["www.connectacorpcrm.com.br", "localhost:3000", "connecta-preview.vercel.app"]) {
    const response = await middleware(new NextRequest(`https://${host}/login`, {
      headers: { "x-connecta-pathname": "//attacker.invalid" },
    }));
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("x-middleware-request-x-connecta-pathname"), "/login");
  }
  const api = await middleware(new NextRequest("https://connecta-phi.vercel.app/api/leads"));
  assert.equal(api.status, 401);
  assert.equal(api.headers.get("location"), null);
  const action = await middleware(new NextRequest("https://connecta-phi.vercel.app/login", { method: "POST" }));
  assert.equal(action.headers.get("location"), null);
  console.log("Canonical domain: redirects, Meta GET/POST, API auth, local/preview and pathname checks passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
