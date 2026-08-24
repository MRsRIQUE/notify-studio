// Utilidades de contraste WCAG 2.1 (pure functions, determinicas).

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

// Converte cores CSS rgba(...) com canal alfa composto sobre um fundo opaco,
// retornando o RGB efetivo (resultante da composicao).
export function rgbaOverBackground(
  color: string,
  background: string,
): Rgb {
  const bg = hexToRgb(background);
  const match = color.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (!match) return hexToRgb(color);
  const [, rs, gs, bs, alphaRaw] = match;
  const alpha = alphaRaw === undefined ? 1 : Number(alphaRaw);
  const fg = { r: Number(rs), g: Number(gs), b: Number(bs) };
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
  };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

// Razao de contraste WCAG 2.1: 1..21. AA exige >= 4.5 para texto normal e
// >= 3.0 para texto grande; componentes de UI exigem >= 3.0.
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsAA(ratio: number, largeText = false): boolean {
  return ratio >= (largeText ? 3 : 4.5);
}
