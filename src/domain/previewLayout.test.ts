import { describe, expect, it } from "vitest";
import {
  computePreviewSize,
  PREVIEW_ASPECT,
  PREVIEW_MAX_HEIGHT_RATIO,
} from "./previewLayout";

// Aparelhos reais (dp) usados como referencia nos casos abaixo.
const PIXEL_8 = { width: 412, height: 915 };
const COMPACTO = { width: 360, height: 640 };
const TABLET = { width: 800, height: 1280 };

describe("computePreviewSize", () => {
  it("nunca ultrapassa a fracao maxima da altura util", () => {
    for (const d of [PIXEL_8, COMPACTO, TABLET]) {
      const insets = 24 + 48;
      const { previewHeight } = computePreviewSize(d.width, d.height, insets);
      const limite = (d.height - insets) * PREVIEW_MAX_HEIGHT_RATIO;
      expect(previewHeight).toBeLessThanOrEqual(Math.ceil(limite));
    }
  });

  it("preserva a proporcao 9:16 do export", () => {
    for (const d of [PIXEL_8, COMPACTO, TABLET]) {
      const { previewWidth, previewHeight } = computePreviewSize(
        d.width,
        d.height,
        72,
      );
      expect(previewHeight / previewWidth).toBeCloseTo(PREVIEW_ASPECT, 1);
    }
  });

  it("deixa a maior parte da tela para as abas e controles", () => {
    // A regressao relatada: preview ocupando ~76% da altura.
    const { previewHeight } = computePreviewSize(
      PIXEL_8.width,
      PIXEL_8.height,
      72,
    );
    expect(previewHeight / PIXEL_8.height).toBeLessThan(0.5);
  });

  it("nunca excede a largura util do aparelho", () => {
    for (const d of [PIXEL_8, COMPACTO, TABLET]) {
      const { previewWidth } = computePreviewSize(d.width, d.height, 72);
      expect(previewWidth).toBeLessThanOrEqual(d.width);
    }
  });

  it("encolhe quando os insets crescem", () => {
    const semInset = computePreviewSize(PIXEL_8.width, PIXEL_8.height, 0);
    const comInset = computePreviewSize(PIXEL_8.width, PIXEL_8.height, 160);
    expect(comInset.previewHeight).toBeLessThan(semInset.previewHeight);
  });

  it("degrada sem quebrar em dimensoes degeneradas", () => {
    const zero = computePreviewSize(0, 0, 0);
    expect(zero.previewWidth).toBe(0);
    expect(zero.previewHeight).toBe(0);

    // Insets maiores que a tela nao produzem valores negativos.
    const insetsAbsurdos = computePreviewSize(412, 200, 9999);
    expect(insetsAbsurdos.previewHeight).toBeGreaterThanOrEqual(0);
    expect(insetsAbsurdos.previewWidth).toBeGreaterThanOrEqual(0);
  });

  it("e determinista", () => {
    const a = computePreviewSize(412, 915, 72);
    const b = computePreviewSize(412, 915, 72);
    expect(a).toEqual(b);
  });
});
