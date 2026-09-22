import assert from "node:assert/strict";
import { publishConversationEvent } from "../src/server/realtime/conversation-events";

async function main() {
  const origin = process.argv[2];
  if (!origin || !/^https?:\/\//.test(origin)) throw new Error("Informe a URL do CRM.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];
  try {
    const unauthenticated = await fetch(origin + "/api/conversations/stream", { redirect: "manual", signal: controller.signal });
    assert.equal(unauthenticated.status, 401);
    const login = await fetch(origin + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ email: process.env.ADMIN_INITIAL_EMAIL, password: process.env.ADMIN_INITIAL_PASSWORD }),
    });
    assert.equal(login.status, 200, "Login required for smoke test");
    const cookie = login.headers.getSetCookie().find(value => value.startsWith("connecta_session="))?.split(";")[0];
    assert.ok(cookie, "Session cookie");
    const waitEvent = async (reader: ReadableStreamDefaultReader<Uint8Array>, event: string) => {
      let text = "";
      const decoder = new TextDecoder();
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("Stream closed before event");
        text += decoder.decode(chunk.value, { stream: true });
        if (text.includes("event: " + event) && text.endsWith("\n\n")) return text;
      }
    };
    for (let i = 0; i < 2; i++) {
      const response = await fetch(origin + "/api/conversations/stream", { headers: { Cookie: cookie }, signal: controller.signal });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") || "", /text\/event-stream/);
      const reader = response.body!.getReader();
      readers.push(reader);
      await waitEvent(reader, "connected");
    }
    const events = readers.map(reader => waitEvent(reader, "conversation-update"));
    await publishConversationEvent({ type: "realtime-smoke-test", body: "must-not-leak" });
    for (const data of await Promise.all(events)) {
      assert.match(data, /"refresh":true/);
      assert.ok(!data.includes("must-not-leak"));
    }
    console.log("PASS deployed SSE: authentication, two simultaneous clients, live event delivery and no private payload");
  } finally {
    controller.abort();
    await Promise.allSettled(readers.map(reader => reader.cancel()));
    clearTimeout(timeout);
    await globalThis.__connectaTelecomConversationPool?.end();
  }
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });
