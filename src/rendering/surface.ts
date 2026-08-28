import { Skia, type SkSurface } from "@shopify/react-native-skia";

// Criacao de superficie com fallback.
//
// MakeOffscreen usa GPU e e mais rapida, mas retorna null em aparelhos cuja
// stack grafica nao expoe contexto utilizavel (visto no moto g04s / Unisoc).
// Antes isso virava export abortado com mensagem de "precisa de GPU"; agora
// caimos para uma superficie de CPU, que e mais lenta porem funciona em
// qualquer aparelho.
export function makeRenderSurface(width: number, height: number): SkSurface {
  const gpu = Skia.Surface.MakeOffscreen(width, height);
  if (gpu) return gpu;

  const cpu = Skia.Surface.Make(width, height);
  if (cpu) return cpu;

  throw new Error(
    `Nao foi possivel criar a superficie de renderizacao ${width}x${height} ` +
      "(nem GPU nem CPU). O aparelho pode estar sem memoria disponivel.",
  );
}
