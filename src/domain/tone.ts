const SAMPLE_RATE = 22050;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function generateToneWav(freq: number, durationMs: number): Uint8Array {
  const numSamples = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000));
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const fadeIn = Math.floor(SAMPLE_RATE * 0.01);
  const fadeOut = Math.floor(SAMPLE_RATE * 0.05);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.min(
      1,
      i / Math.max(1, fadeIn),
      (numSamples - i) / Math.max(1, fadeOut),
    );
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * Math.max(0, env);
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new Uint8Array(buffer);
}
