import { describe, expect, it } from "vitest";
import { generateToneWav } from "./tone";

describe("generateToneWav", () => {
  it("gera header WAV valido (RIFF/WAVE/fmt/data)", () => {
    const wav = generateToneWav(880, 100);
    const header = String.fromCharCode(...wav.slice(0, 4));
    expect(header).toBe("RIFF");
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe("WAVE");
    expect(String.fromCharCode(...wav.slice(12, 16))).toBe("fmt ");
    expect(String.fromCharCode(...wav.slice(36, 40))).toBe("data");
  });

  it("e determinista para os mesmos parametros", () => {
    const a = generateToneWav(440, 200);
    const b = generateToneWav(440, 200);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("produz amostras nao nulas para uma frequencia real", () => {
    const wav = generateToneWav(1000, 100);
    const samples = new Int16Array(wav.buffer, 44);
    const peak = Math.max(...Array.from(samples).map(Math.abs));
    expect(peak).toBeGreaterThan(0);
  });
});
