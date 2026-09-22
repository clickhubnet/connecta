import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

let now = 0, nextTimer = 0;
const timers = new Map();
function schedule(fn, delay, interval = false) {
  const id = ++nextTimer;
  timers.set(id, { fn, at: now + delay, delay, interval });
  return id;
}
async function advance(ms) {
  const target = now + ms;
  for (;;) {
    const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a,b) => a[1].at-b[1].at)[0];
    if (!due) break;
    const [id, timer] = due;
    now = timer.at;
    if (timer.interval) timer.at += timer.delay; else timers.delete(id);
    timer.fn();
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }
  now = target;
}
const sources = [];
class FakeSource extends EventTarget {
  constructor(url) { super(); this.url = url; this.closed = false; sources.push(this); }
  close() { this.closed = true; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
const document = Object.assign(new EventTarget(), { visibilityState: "visible" });
const window = new EventTarget();
const navigator = { onLine: true };
const context = vm.createContext({
  exports: {}, document, window, navigator, EventSource: FakeSource,
  Date: { now: () => now }, Math: { random: () => 0, floor: Math.floor, min: Math.min },
  setTimeout: (fn, delay) => schedule(fn, delay), clearTimeout: id => timers.delete(id),
  setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: id => timers.delete(id),
});
vm.runInContext(ts.transpileModule(readFileSync("src/lib/realtime/conversation-feed.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
let refreshes = 0, activeRequests = 0, maxRequests = 0, release;
let hold = false;
const statuses = [];
const dispose = context.exports.startConversationFeed(async () => {
  refreshes++; activeRequests++; maxRequests = Math.max(maxRequests, activeRequests);
  if (hold) await new Promise(resolve => { release = resolve; });
  activeRequests--;
}, value => statuses.push(value));
assert.equal(sources.length, 1);
sources[0].emit("connected");
await advance(250);
assert.equal(refreshes, 1);
for (let i=0;i<10;i++) sources[0].emit("conversation-update");
await advance(250);
assert.equal(refreshes, 2, "Burst is coalesced");
hold = true;
sources[0].emit("conversation-update");
await advance(250);
sources[0].emit("conversation-update");
await advance(1000);
assert.equal(refreshes, 3);
hold = false; release();
for (let i=0;i<5;i++) await Promise.resolve();
await advance(250);
assert.equal(refreshes, 4, "Event during request triggers a final refresh");
assert.equal(maxRequests, 1);
sources[0].onerror();
assert.equal(sources[0].closed, true);
await advance(1000);
assert.equal(sources.length, 2);
sources[1].emit("connected");
await advance(250);
assert.equal(refreshes, 5, "Reconnect reloads events missed offline");
document.visibilityState = "hidden";
document.dispatchEvent(new Event("visibilitychange"));
const previousRefreshes = refreshes;
await advance(60000);
assert.equal(refreshes, previousRefreshes);
assert.equal(sources.length, 2);
document.visibilityState = "visible";
document.dispatchEvent(new Event("visibilitychange"));
assert.equal(sources.length, 3);
navigator.onLine = false;
window.dispatchEvent(new Event("offline"));
assert.equal(sources[2].closed, true);
navigator.onLine = true;
window.dispatchEvent(new Event("online"));
assert.equal(sources.length, 4);
dispose();
assert.equal(timers.size, 0);
assert.equal(sources[3].closed, true);
console.log("PASS event refresh, burst coalescing, request serialization, reconnection, hidden tab pause, offline recovery and cleanup");
