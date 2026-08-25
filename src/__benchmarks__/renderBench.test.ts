/**
 * Benchmark de performance — drawNotification
 *
 * Roda com: npx tsx src/__benchmarks__/renderBench.ts
 * (requer tsx instalado, ou usar vitest com --run)
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock Skia (leve, sem GPU) ────────────────────────────────────────────────

const mockFont = {
  measureText: (text: string) => ({ width: text.length * 7 }),
  getSize: () => 14,
};

vi.mock("@shopify/react-native-skia", () => {
  const canvas = {
    drawRect: () => {},
    drawRRect: () => {},
    drawCircle: () => {},
    drawText: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    saveLayer: () => {},
  };
  return {
    Skia: {
      Paint: () => ({
        setColor: () => {},
        setAlphaf: () => {},
      }),
      Color: () => [0, 0, 0, 1],
      XYWHRect: (x: number, y: number, w: number, h: number) => ({
        x,
        y,
        w,
        h,
      }),
      RRectXY: () => ({}),
      Surface: {
        MakeOffscreen: () => ({
          getCanvas: () => canvas,
          makeImageSnapshot: () => ({
            encodeToBytes: () => new Uint8Array(50000),
            readPixels: () => new Uint8Array(540 * 960 * 4),
            dispose: () => {},
          }),
          dispose: () => {},
        }),
      },
    },
    matchFont: () => mockFont,
    ColorType: { RGBA_8888: 0 },
    AlphaType: { Opaque: 0 },
  };
});

vi.mock("expo-file-system", () => ({
  File: class {
    uri = "file:///mock/file.gif";
    write = () => {};
    exists = true;
    delete = () => {};
  },
  Directory: class {
    create = () => {};
    exists = true;
    delete = () => {};
  },
  Paths: { cache: "/mock/cache" },
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: () => Promise.resolve(true),
  shareAsync: () => Promise.resolve(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { drawNotification, type RenderSpec } from "../rendering/drawNotification";
import { TEMPLATES } from "../domain/templates";
import type { PlatformStyle, DisclosureConfig, SaleEvent } from "../domain/types";

// ── Config ───────────────────────────────────────────────────────────────────

const STYLES: PlatformStyle[] = ["ios-inspired", "android-inspired", "generic"];
const THEMES: ("light" | "dark")[] = ["light", "dark"];
const TEMPLATESSelection = TEMPLATES.slice(0, 5);
const WIDTH = 1080;
const HEIGHT = 1920;

const DISCLOSURE: DisclosureConfig = {
  text: "Demonstração — dados simulados",
  position: "bottom",
  style: "bar",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSpec(
  style: PlatformStyle,
  theme: "light" | "dark",
  event: SaleEvent,
): RenderSpec {
  return {
    width: WIDTH,
    height: HEIGHT,
    style,
    theme,
    disclosure: DISCLOSURE,
    event,
  };
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function p95(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Benchmark ────────────────────────────────────────────────────────────────

describe("Benchmark: drawNotification", () => {
  const results: { style: string; theme: string; template: string; ms: number }[] = [];

  for (const style of STYLES) {
    for (const theme of THEMES) {
      for (const tpl of TEMPLATESSelection) {
        it(`${style} × ${theme} × ${tpl.id}`, () => {
          const event = tpl.events[0];
          if (!event) return;

          const spec = makeSpec(style, theme, event);
          const canvas = {
            drawRect: () => {},
            drawRRect: () => {},
            drawCircle: () => {},
            drawText: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            saveLayer: () => {},
          } as never;

          // warmup
          for (let i = 0; i < 5; i++) {
            drawNotification(canvas, spec);
          }

          // measure
          const times: number[] = [];
          const RUNS = 30;
          for (let i = 0; i < RUNS; i++) {
            const t0 = performance.now();
            drawNotification(canvas, spec);
            const t1 = performance.now();
            times.push(t1 - t0);
          }

          const avg = mean(times);
          const p = p95(times);
          results.push({ style, theme, template: tpl.id, ms: avg });

          // soft assert: cada run < 10ms (budget para 60fps = 16.6ms)
          expect(p).toBeLessThan(10);
        });
      }
    }
  }

  it("resumo: media e p95 por estilo", () => {
    const byStyle = new Map<string, number[]>();
    for (const r of results) {
      const key = r.style;
      if (!byStyle.has(key)) byStyle.set(key, []);
      byStyle.get(key)!.push(r.ms);
    }

    console.log("\n═══ drawNotification Benchmark ═══");
    console.log(`Total runs: ${results.length}`);
    console.log("─".repeat(50));

    for (const [style, times] of byStyle) {
      console.log(
        `  ${style.padEnd(20)} mean=${mean(times).toFixed(3)}ms  p95=${p95(times).toFixed(3)}ms`,
      );
    }

    const allTimes = results.map((r) => r.ms);
    console.log("─".repeat(50));
    console.log(
      `  GLOBAL${" ".repeat(14)} mean=${mean(allTimes).toFixed(3)}ms  p95=${p95(allTimes).toFixed(3)}ms`,
    );
    console.log("═".repeat(50));

    expect(allTimes.length).toBe(30);
  });
});
