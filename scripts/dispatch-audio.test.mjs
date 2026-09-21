import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import ts from "typescript";

const bundle = readFileSync("public/vendor/lame.all.js", "utf8");
const source = readFileSync("src/modules/envio-em-massa/components/dispatch-conversations.tsx", "utf8");
const audioCode = source.slice(source.indexOf("type BrowserAudioContext"));
const validator = readFileSync("src/lib/audio/mp3.ts", "utf8");
const context = vm.createContext({ Blob, Int16Array, Int8Array, Float32Array, Uint8Array, console, exports: {} });
vm.runInContext(bundle, context);
vm.runInContext("window = { lamejs };", context);
vm.runInContext(ts.transpileModule(audioCode, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
vm.runInContext(ts.transpileModule(validator, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
const dir = mkdtempSync(join(tmpdir(), "connecta-audio-"));
try {
  for (const rate of [16000, 22050, 44100, 48000, 96000]) {
    context.samples = Float32Array.from({ length: rate }, (_, i) => Math.sin(2 * Math.PI * 440 * i / rate) * 0.4);
    context.rate = rate;
    const blob = await vm.runInContext("encodeMp3(samples, rate)", context);
    assert.equal(blob.type, "audio/mpeg");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.ok(context.exports.isMp3Audio(bytes), "valid MP3 frames");
    const path = join(dir, rate + ".mp3");
    writeFileSync(path, bytes);
    const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-of", "json", path], { encoding: "utf8" }));
    assert.equal(probe.streams[0].codec_name, "mp3");
    assert.equal(probe.streams[0].channels, 1);
    const duration = Number(probe.streams[0].duration);
    assert.ok(duration >= 0.95 && duration < 1.3, "correct duration");
    execFileSync("ffmpeg", ["-v", "error", "-i", path, "-f", "null", "-"]);
    console.log("PASS MP3 encode/decode, input sample rate", rate);
  }
  assert.equal(context.exports.isMp3Audio(new Uint8Array(2048)), false);
  assert.equal(context.exports.isMp3Audio(new TextEncoder().encode("RIFF WEBM renamed.mp3")), false);
  assert.equal(context.exports.isMp3Audio(new Uint8Array([0xff, 0xfb, 0x90, 0x00])), false);
  console.log("PASS rejects empty, renamed and truncated audio");
} finally { rmSync(dir, { recursive: true, force: true }); }

// Failed download must not leave subsequent recording attempts waiting forever.
vm.runInContext("window = { setTimeout, clearTimeout }; lameLoading = null;", Object.assign(context, { setTimeout, clearTimeout }));
let appended = [];
context.document = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, remove() {} }),
  head: { appendChild(script) { appended.push(script); } },
};
const failed = vm.runInContext("loadLameEncoder()", context);
assert.equal(vm.runInContext("loadLameEncoder()", context), failed);
appended[0].onerror();
await assert.rejects(failed);
const retried = vm.runInContext("loadLameEncoder()", context);
assert.equal(appended.length, 2);
vm.runInContext("window.lamejs = lamejs", context);
appended[1].onload();
assert.ok((await retried).Mp3Encoder);
console.log("PASS encoder load failure, retry and concurrent calls");
