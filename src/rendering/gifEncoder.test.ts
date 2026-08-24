import { describe, expect, it } from "vitest";
import {
  buildWebSafePalette,
  quantizeToWebSafeIndex,
  rgbaToIndexed,
  encodeGif,
} from "./gifEncoder";

describe("buildWebSafePalette", () => {
  it("gera 256 entradas (216 web-safe + padding potencia de 2)", () => {
    const palette = buildWebSafePalette();
    expect(palette).toHaveLength(256);
  });

  it("e determinista entre chamadas", () => {
    expect(buildWebSafePalette()).toEqual(buildWebSafePalette());
  });
});

describe("quantizeToWebSafeIndex", () => {
  it("mapeia cores puras corretamente", () => {
    expect(quantizeToWebSafeIndex(0, 0, 0)).toBe(0);
    expect(quantizeToWebSafeIndex(255, 255, 255)).toBe(215);
    expect(quantizeToWebSafeIndex(255, 0, 0)).toBe(5 * 36);
  });

  it("arredonda para o nivel mais proximo", () => {
    // 0x22 = 34, mais proximo de 0x33 (51) do que de 0x00
    expect(quantizeToWebSafeIndex(34, 34, 34)).toBe(
      quantizeToWebSafeIndex(51, 51, 51),
    );
  });

  it("clampa valores fora do range", () => {
    expect(quantizeToWebSafeIndex(300, -5, 128)).toBe(
      quantizeToWebSafeIndex(255, 0, 128),
    );
  });
});

describe("rgbaToIndexed", () => {
  it("produz um indice por pixel", () => {
    const rgba = new Uint8Array([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      17, 17, 17, 255,
    ]);
    const indexed = rgbaToIndexed(rgba);
    expect(indexed).toHaveLength(4);
    expect(indexed[0]).toBe(quantizeToWebSafeIndex(255, 0, 0));
    expect(indexed[1]).toBe(quantizeToWebSafeIndex(0, 255, 0));
    expect(indexed[2]).toBe(quantizeToWebSafeIndex(0, 0, 255));
  });
});

describe("encodeGif", () => {
  function frame(color: number[]): { indexedPixels: number[]; delayCentiseconds: number } {
    return { indexedPixels: color, delayCentiseconds: 8 };
  }

  it("gera header GIF89a e trailer validos", () => {
    const gif = encodeGif(2, 2, [frame([0, 1, 1, 0])]);
    expect(String.fromCharCode(...gif.slice(0, 6))).toBe("GIF89a");
    expect(gif[gif.length - 1]).toBe(0x3b);
  });

  it("e determinista: mesmos frames produzem bytes identicos", () => {
    const frames = [frame([0, 1, 1, 0]), frame([1, 0, 0, 1])];
    const a = encodeGif(2, 2, frames);
    const b = encodeGif(2, 2, frames);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("frames diferentes produzem bytes diferentes", () => {
    const a = encodeGif(2, 2, [frame([0, 0, 0, 0])]);
    const b = encodeGif(2, 2, [frame([1, 1, 1, 1])]);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });

  it("aceita multi-frames de animacao", () => {
    const frames = Array.from({ length: 5 }, (_, i) =>
      frame([i % 216, i % 216, i % 216, i % 216]),
    );
    const gif = encodeGif(2, 2, frames);
    expect(gif.length).toBeGreaterThan(6);
    expect(gif[gif.length - 1]).toBe(0x3b);
  });
});
