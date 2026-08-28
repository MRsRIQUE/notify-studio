import {
  matchFont,
  Skia,
  TileMode,
  type SkCanvas,
  type SkFont,
} from "@shopify/react-native-skia";
import type {
  BackgroundConfig,
  DisclosureConfig,
  PlatformStyle,
  SaleEvent,
} from "../domain/types";
import type { CardAnim } from "../domain/animation";
import { DISCLOSURE_TEXT, validateDisclosure } from "../domain/disclosure";
import { eventBody } from "../domain/currency";
import { palette } from "./palette";

export type { Palette } from "./palette";
export { palette } from "./palette";

export type VisualSpec = {
  width: number;
  height: number;
  style: PlatformStyle;
  theme: "light" | "dark";
  disclosure: DisclosureConfig;
  // Ausente ou kind "auto" => usa o fundo da paleta do tema.
  background?: BackgroundConfig;
};

export type RenderSpec = VisualSpec & {
  event: SaleEvent;
};

export const DISCLOSURE_BAR_HEIGHT_RATIO = 0.045;

export function disclosureBarMetrics(spec: VisualSpec): {
  barY: number;
  barHeight: number;
} {
  const barHeight = Math.max(
    28,
    Math.round(spec.height * DISCLOSURE_BAR_HEIGHT_RATIO),
  );
  const barY =
    spec.disclosure.position === "top" ? 0 : spec.height - barHeight;
  return { barY, barHeight };
}

// Resolve o fundo efetivo: "auto" (ou ausente) cai na paleta do tema.
export function resolveBackground(spec: VisualSpec): BackgroundConfig {
  const p = palette(spec.style, spec.theme);
  const bg = spec.background;
  if (!bg || bg.kind === "auto") return { kind: "solid", color: p.bg };
  if (bg.kind === "gradient") {
    return { kind: "gradient", color: bg.color, colorEnd: bg.colorEnd ?? bg.color };
  }
  return { kind: "solid", color: bg.color };
}

function fillBackground(canvas: SkCanvas, spec: VisualSpec): void {
  const { width, height } = spec;
  const resolved = resolveBackground(spec);
  const paint = Skia.Paint();

  if (resolved.kind === "gradient") {
    const shader = Skia.Shader.MakeLinearGradient(
      Skia.Point(0, 0),
      Skia.Point(0, height),
      [Skia.Color(resolved.color), Skia.Color(resolved.colorEnd ?? resolved.color)],
      null,
      TileMode.Clamp,
    );
    paint.setShader(shader);
  } else {
    paint.setColor(Skia.Color(resolved.color));
  }

  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
}

export function drawBackground(canvas: SkCanvas, spec: VisualSpec): void {
  const { width, style, theme } = spec;
  const p = palette(style, theme);

  fillBackground(canvas, spec);

  const { barY, barHeight } = disclosureBarMetrics(spec);
  const barPaint = Skia.Paint();
  barPaint.setColor(Skia.Color(p.bar));
  canvas.drawRect(Skia.XYWHRect(0, barY, width, barHeight), barPaint);

  const fontBar = fontFor(Math.round(barHeight * 0.42));
  const barLabel = DISCLOSURE_TEXT;
  const barLabelWidth = fontBar.measureText(barLabel).width;
  drawText(
    canvas,
    fontBar,
    barLabel,
    (width - barLabelWidth) / 2,
    barY + barHeight / 2 + fontBar.getSize() * 0.35,
    p.barText,
  );
}

export function drawNotificationCard(
  canvas: SkCanvas,
  spec: RenderSpec,
  anim?: CardAnim,
): void {
  const alpha = anim?.opacity ?? 1;
  const dy = anim?.translateY ?? 0;

  canvas.save();
  canvas.translate(0, dy);

  if (alpha < 1) {
    const layerPaint = Skia.Paint();
    layerPaint.setAlphaf(alpha);
    canvas.saveLayer(layerPaint, null);
    drawCardContents(canvas, spec);
    canvas.restore();
  } else {
    drawCardContents(canvas, spec);
  }

  canvas.restore();
}

function drawCardContents(canvas: SkCanvas, spec: RenderSpec): void {
  const { width, height, event, style, theme, disclosure } = spec;
  const p = palette(style, theme);

  const { barY, barHeight } = disclosureBarMetrics(spec);

  const pad = Math.round(width * 0.06);
  const cardTop =
    disclosure.position === "top" ? barY + barHeight + pad : pad * 2;
  const cardWidth = width - pad * 2;
  const cardHeight = Math.round(height * 0.14);
  const radius = style === "android-inspired" ? 24 : 20;

  const cardPaint = Skia.Paint();
  cardPaint.setColor(Skia.Color(p.card));
  const card = Skia.RRectXY(
    Skia.XYWHRect(pad, cardTop, cardWidth, cardHeight),
    radius,
    radius,
  );
  canvas.drawRRect(card, cardPaint);

  const fontTitle = fontFor(Math.round(cardHeight * 0.17));
  const fontBody = fontFor(Math.round(cardHeight * 0.145));
  const fontTime = fontFor(Math.round(cardHeight * 0.12));

  const iconSize = cardHeight * 0.5;
  const iconX = pad + cardHeight * 0.3;
  const iconY = cardTop + (cardHeight - iconSize) / 2;
  const iconPaint = Skia.Paint();
  iconPaint.setColor(Skia.Color(p.accent));
  canvas.drawCircle(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, iconPaint);

  const textX = iconX + iconSize + cardHeight * 0.25;
  const timeStr = formatTime(event.timeMs);

  drawText(canvas, fontTitle, event.title, textX, cardTop + cardHeight * 0.38, p.title);
  drawText(
    canvas,
    fontBody,
    eventBody(event),
    textX,
    cardTop + cardHeight * 0.66,
    p.body,
    cardWidth - (textX - pad) - cardHeight * 0.1,
  );

  const timeWidth = fontTime.measureText(timeStr).width;
  drawText(
    canvas,
    fontTime,
    timeStr,
    pad + cardWidth - timeWidth - cardHeight * 0.1,
    cardTop + cardHeight * 0.28,
    p.time,
  );
  drawText(
    canvas,
    fontBody,
    `${event.storeName}${event.buyerAlias ? ` \u00b7 ${event.buyerAlias}` : ""}`,
    textX,
    cardTop + cardHeight * 0.88,
    p.accent,
    cardWidth - (textX - pad) - cardHeight * 0.1,
  );
}

export function drawNotification(canvas: SkCanvas, spec: RenderSpec): void {
  drawBackground(canvas, spec);
  drawNotificationCard(canvas, spec);
}

export function assertDisclosureVisible(spec: VisualSpec): void {
  const { barY, barHeight } = disclosureBarMetrics(spec);
  const result = validateDisclosure(spec.disclosure, {
    height: spec.height,
    barY,
    barHeight,
  });
  if (!result.ok) {
    throw new Error(`Export blocked: disclosure invalid (${result.reason})`);
  }
}

function formatTime(timeMs: number): string {
  const totalSeconds = Math.floor(timeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const base = `0${minutes}`.slice(-2) + ":" + `0${seconds}`.slice(-2);
  return `agora \u00b7 ${base}`;
}

function drawText(
  canvas: SkCanvas,
  font: SkFont,
  text: string,
  x: number,
  y: number,
  color: string,
  maxWidth?: number,
): void {
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  let label = text;
  if (maxWidth) {
    while (label.length > 1 && font.measureText(label).width > maxWidth) {
      label = label.slice(0, Math.max(1, label.length - 2)) + "\u2026";
    }
  }
  canvas.drawText(label, x, y, paint, font);
}

const fontCache = new Map<number, SkFont>();
function fontFor(size: number): SkFont {
  const cached = fontCache.get(size);
  if (cached) return cached;
  const font = matchFont({ fontFamily: "sans-serif", fontSize: size });
  fontCache.set(size, font);
  return font;
}
