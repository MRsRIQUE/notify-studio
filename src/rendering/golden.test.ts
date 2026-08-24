import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { drawNotification } from "../rendering/drawNotification";
import type { RenderSpec } from "../rendering/drawNotification";
import { TEMPLATES } from "../domain/templates";
import type { PlatformStyle } from "../domain/types";
import { DEFAULT_DISCLOSURE } from "../domain/types";

vi.mock("@shopify/react-native-skia", () => {
  class MockFont {
    constructor(readonly size: number) {}
    measureText(text: string): { width: number } {
      return { width: text.length * this.size * 0.55 };
    }
    getSize(): number {
      return this.size;
    }
  }
  const fonts = new Map<number, MockFont>();
  class MockPaint {
    color = "";
    alpha = 1;
    setColor(c: string) {
      this.color = c;
    }
    setAlphaf(a: number) {
      this.alpha = a;
    }
  }
  return {
    matchFont: ({ fontSize }: { fontSize: number }) => {
      if (!fonts.has(fontSize)) fonts.set(fontSize, new MockFont(fontSize));
      return fonts.get(fontSize);
    },
    Skia: {
      Paint: () => new MockPaint(),
      Color: (c: string) => c,
      XYWHRect: (x: number, y: number, w: number, h: number) => ({
        x,
        y,
        width: w,
        height: h,
      }),
      RRectXY: (
        rect: { x: number; y: number; width: number; height: number },
        rx: number,
        ry: number,
      ) => ({ rect, rx, ry }),
      Surface: { MakeOffscreen: () => null },
    },
  };
});

type Op =
  | { op: "rect"; x: number; y: number; w: number; h: number; color: string }
  | {
      op: "rrect";
      x: number;
      y: number;
      w: number;
      h: number;
      rx: number;
      ry: number;
      color: string;
    }
  | { op: "circle"; x: number; y: number; r: number; color: string }
  | { op: "text"; text: string; x: number; y: number; color: string; size: number };

class RecordingCanvas {
  ops: Op[] = [];
  drawRect(rect: { x: number; y: number; width: number; height: number }, paint: { color: string }) {
    this.ops.push({
      op: "rect",
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      color: paint.color,
    });
  }
  drawRRect(
    rrect: { rect: { x: number; y: number; width: number; height: number }; rx: number; ry: number },
    paint: { color: string },
  ) {
    this.ops.push({
      op: "rrect",
      x: rrect.rect.x,
      y: rrect.rect.y,
      w: rrect.rect.width,
      h: rrect.rect.height,
      rx: rrect.rx,
      ry: rrect.ry,
      color: paint.color,
    });
  }
  drawCircle(x: number, y: number, r: number, paint: { color: string }) {
    this.ops.push({ op: "circle", x, y, r, color: paint.color });
  }
  drawText(
    text: string,
    x: number,
    y: number,
    paint: { color: string },
    font: { getSize: () => number },
  ) {
    this.ops.push({ op: "text", text, x, y, color: paint.color, size: font.getSize() });
  }
  save() {
    return 1;
  }
  restore() {}
  translate() {}
  saveLayer() {
    return 1;
  }
}

function hashOps(ops: Op[]): string {
  const canonical = ops.map((o) => JSON.stringify(o)).join("|");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

const STYLES: PlatformStyle[] = ["ios-inspired", "android-inspired", "generic"];
const THEMES = ["light", "dark"] as const;
const RESOLUTIONS: { key: string; width: number; height: number }[] = [
  { key: "vertical-9x16", width: 1080, height: 1920 },
  { key: "square-1x1", width: 1080, height: 1080 },
  { key: "feed-4x5", width: 1080, height: 1350 },
];

function render(
  event: RenderSpec["event"],
  style: PlatformStyle,
  theme: "light" | "dark",
  width: number,
  height: number,
): string {
  const canvas = new RecordingCanvas();
  drawNotification(canvas as never, {
    width,
    height,
    event,
    style,
    theme,
    disclosure: DEFAULT_DISCLOSURE,
  });
  return hashOps(canvas.ops);
}

describe("golden frames do drawNotification", () => {
  it("gera hashes deterministicos para cada template/estilo/tema/resolucao", () => {
    const golden: Record<string, string> = {};
    for (const tpl of TEMPLATES) {
      const event = tpl.events[0]!;
      for (const style of STYLES) {
        for (const theme of THEMES) {
          for (const res of RESOLUTIONS) {
            const key = `${tpl.id}|${style}|${theme}|${res.key}`;
            golden[key] = render(event, style, theme, res.width, res.height);
          }
        }
      }
    }
    expect(golden).toMatchSnapshot();
  });

  it("e determinista: renderizar duas vezes produz o mesmo hash", () => {
    const event = TEMPLATES[0]!.events[0]!;
    const a = render(event, "ios-inspired", "light", 1080, 1920);
    const b = render(event, "ios-inspired", "light", 1080, 1920);
    expect(a).toBe(b);
  });

  it("tema escuro difere do tema claro", () => {
    const event = TEMPLATES[0]!.events[0]!;
    const light = render(event, "generic", "light", 1080, 1920);
    const dark = render(event, "generic", "dark", 1080, 1920);
    expect(light).not.toBe(dark);
  });

  it("estilos diferentes produzem hashes diferentes", () => {
    const event = TEMPLATES[0]!.events[0]!;
    const ios = render(event, "ios-inspired", "light", 1080, 1920);
    const android = render(event, "android-inspired", "light", 1080, 1920);
    expect(ios).not.toBe(android);
  });
});
