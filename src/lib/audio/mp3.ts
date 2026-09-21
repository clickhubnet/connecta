// Validate consecutive MPEG Layer III frames, rather than trusting the filename.
export function isMp3Audio(bytes: Uint8Array): boolean {
  let start = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    if (bytes.length < 10 || [6, 7, 8, 9].some((i) => bytes[i] & 0x80)) return false;
    start = 10 + (bytes[6] << 21 | bytes[7] << 14 | bytes[8] << 7 | bytes[9]);
    if (bytes[5] & 0x10) start += 10;
  }
  const frameSize = (offset: number) => {
    if (offset + 4 > bytes.length || bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) return 0;
    const version = (bytes[offset + 1] >> 3) & 3;
    const layer = (bytes[offset + 1] >> 1) & 3;
    const rateIndex = (bytes[offset + 2] >> 2) & 3;
    const bitrateIndex = bytes[offset + 2] >> 4;
    if (version === 1 || layer !== 1 || rateIndex === 3 || bitrateIndex === 0 || bitrateIndex === 15) return 0;
    const rates = version === 3 ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
    const sampleRate = [44100, 48000, 32000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    return Math.floor((version === 3 ? 144000 : 72000) * rates[bitrateIndex] / sampleRate) + ((bytes[offset + 2] >> 1) & 1);
  };
  // Some encoders insert a short prefix before the first frame.
  for (let offset = start; offset < Math.min(start + 4096, bytes.length - 4); offset++) {
    const first = frameSize(offset);
    if (!first) continue;
    const second = frameSize(offset + first);
    if (second && offset + first + second <= bytes.length) return true;
  }
  return false;
}
