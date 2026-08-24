// GIF89a encoder via omggif. Pseudo-rendering controle
// deterministico: paleta fixa web-safe (216 cores, completada para 256 porque
// o omggif exige tamanho de paleta potencia de 2) + quantizacao por
// arredondamento para o indice da web-safe mais proxima (sem median-cut, sem
// dithering). Tudo puro-JS e determinista.
import { GifWriter } from "omggif";

// Paleta web-safe: 6x6x6 = 216 cores (.values are 0xRRGGBB ints),
// completada para 256 (potencia de 2, exigencia do omggif).
export function buildWebSafePalette(): number[] {
  const palette: number[] = [];
  const levels = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
  for (const r of levels) {
    for (const g of levels) {
      for (const b of levels) {
        palette.push((r << 16) | (g << 8) | b);
      }
    }
  }
  // omggif exige paleta com tamanho potencia de 2 entre 2 e 256.
  while (palette.length < 256) {
    palette.push(0x000000);
  }
  return palette;
}

// Mapeia uma cor RGB (0-255) para o indice web-safe mais proximo.
export function quantizeToWebSafeIndex(r: number, g: number, b: number): number {
  const ri = Math.min(5, Math.round(r / 51));
  const gi = Math.min(5, Math.round(g / 51));
  const bi = Math.min(5, Math.round(b / 51));
  return ri * 36 + gi * 6 + bi;
}

// Converte um buffer RGBA (width*height*4) em indices indexados.
export function rgbaToIndexed(rgba: Uint8Array | Float32Array): number[] {
  const out = new Array(rgba.length / 4);
  for (let i = 0, o = 0; i < rgba.length; i += 4, o++) {
    out[o] = quantizeToWebSafeIndex(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
  }
  return out;
}

export type GifFrame = {
  // index[]=indice na paleta para cada pixel (w*h)
  indexedPixels: number[];
  delayCentiseconds: number;
};

export function encodeGif(
  width: number,
  height: number,
  frames: GifFrame[],
): Uint8Array {
  const palette = buildWebSafePalette();
  const buf: number[] = [];
  const writer = new GifWriter(buf, width, height, { loop: 0 });
  for (const frame of frames) {
    writer.addFrame(0, 0, width, height, frame.indexedPixels, {
      palette,
      delay: frame.delayCentiseconds,
      disposal: 1,
    });
  }
  writer.end();
  return Uint8Array.from(buf);
}
