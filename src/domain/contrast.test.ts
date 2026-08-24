import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexToRgb,
  meetsAA,
  rgbaOverBackground,
} from "./contrast";
import { palette } from "../rendering/palette";
import type { PlatformStyle } from "./types";
import { DISCLOSURE_TEXT } from "./disclosure";
import { DEFAULT_DISCLOSURE } from "./types";

const STYLES: PlatformStyle[] = ["ios-inspired", "android-inspired", "generic"];
const THEMES = ["light", "dark"] as const;

describe("contrastRatio", () => {
  it("branco sobre preto tem razao 21", () => {
    expect(contrastRatio(hexToRgb("#FFFFFF"), hexToRgb("#000000"))).toBeCloseTo(
      21,
      1,
    );
  });
  it("mesma cor tem razao 1", () => {
    expect(contrastRatio(hexToRgb("#123456"), hexToRgb("#123456"))).toBe(1);
  });
});

describe("rgbaOverBackground", () => {
  it("compoem rgba sobre fundo opaco", () => {
    const c = rgbaOverBackground("rgba(0,0,0,0.75)", "#FFFFFF");
    expect(c.r).toBe(Math.round(0 * 0.75 + 255 * 0.25));
  });
  it("hex puro passa direto", () => {
    expect(rgbaOverBackground("#102030", "#FFFFFF")).toEqual(
      hexToRgb("#102030"),
    );
  });
});

describe("contraste AA dos temas do drawNotification", () => {
  for (const style of STYLES) {
    for (const theme of THEMES) {
      it(`titulo sobre cartao (${style}/${theme}) atinge AA`, () => {
        const p = palette(style, theme);
        const ratio = contrastRatio(hexToRgb(p.title), hexToRgb(p.card));
        expect(meetsAA(ratio)).toBe(true);
      });

      it(`corpo sobre cartao (${style}/${theme}) atinge AA`, () => {
        const p = palette(style, theme);
        const ratio = contrastRatio(hexToRgb(p.body), hexToRgb(p.card));
        expect(meetsAA(ratio)).toBe(true);
      });

      it(`aviso de demonstracao sobre barra (${style}/${theme}) atinge AA`, () => {
        const p = palette(style, theme);
        // A barra usa rgba semitransparente composto sobre o fundo do tema.
        const barEffective = rgbaOverBackground(p.bar, p.bg);
        const ratio = contrastRatio(hexToRgb(p.barText), barEffective);
        // Texto da barra e grande (42% da altura da barra) => AA grande = 3.0
        expect(meetsAA(ratio, true)).toBe(true);
      });
    }
  }
});

describe("disclosure", () => {
  it("o texto padrao e fixo e em pt-BR com cedilha", () => {
    expect(DISCLOSURE_TEXT).toBe("Demonstração — dados simulados");
    expect(DEFAULT_DISCLOSURE.text).toBe(DISCLOSURE_TEXT);
  });
});
