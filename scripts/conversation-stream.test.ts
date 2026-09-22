import assert from "node:assert/strict";
import { openConversationStream } from "../src/server/realtime/conversation-stream";
import { publishConversationEvent } from "../src/server/realtime/conversation-events";

async function main() {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12000);
  try {
    const stream = await openConversationStream(abort.signal, 3000);
    const reader = stream.getReader();
    const decode = new TextDecoder();
    assert.match(decode.decode((await reader.read()).value), /event: connected/);
    await publishConversationEvent({ type: "realtime-test", conversationId: "private-test-id", body: "must-not-be-broadcast" });
    const event = decode.decode((await reader.read()).value);
    assert.match(event, /event: conversation-update/);
    assert.match(event, /"refresh":true/);
    assert.ok(!event.includes("private-test-id") && !event.includes("must-not-be-broadcast"));
    const end = await reader.read();
    assert.equal(end.done, true, "Stream closes before Vercel maximum duration");
    const second = await openConversationStream(abort.signal);
    const secondReader = second.getReader();
    await secondReader.read();
    abort.abort();
    assert.equal((await secondReader.read()).done, true, "Aborting releases the stream");
    console.log("PASS live database notification, redacted SSE event, stream rotation and abort");
  } finally {
    abort.abort();
    clearTimeout(timeout);
    await globalThis.__connectaTelecomConversationPool?.end();
  }
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });
