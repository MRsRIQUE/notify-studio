// Dimensionamento do preview do Editor (funcao pura, deterministica).
//
// A versao anterior derivava a altura apenas da largura (largura * 16/9). Num
// aparelho real isso produzia um preview de ~695dp que engolia a tela e deixava
// abas e controles espremidos ou fora dela. Aqui a altura tambem e limitada
// pelo espaco vertical util.

// Fracao maxima da altura util que o preview pode ocupar.
export const PREVIEW_MAX_HEIGHT_RATIO = 0.42;
// Mesma proporcao do export (1080x1920), para o preview ser fiel ao resultado.
export const PREVIEW_ASPECT = 16 / 9;
export const PREVIEW_MAX_WIDTH = 405;

export type PreviewSize = {
  previewWidth: number;
  previewHeight: number;
};

export function computePreviewSize(
  windowWidth: number,
  windowHeight: number,
  verticalInsets: number,
): PreviewSize {
  const usableHeight = Math.max(0, windowHeight - verticalInsets);
  const maxHeight = usableHeight * PREVIEW_MAX_HEIGHT_RATIO;
  const maxWidth = Math.min(PREVIEW_MAX_WIDTH, Math.max(0, windowWidth) * 0.9);

  // Escolhe a dimensao que cabe nos dois limites e deriva a outra dela,
  // preservando 9:16.
  const previewHeight = Math.min(maxWidth * PREVIEW_ASPECT, maxHeight);
  const previewWidth = previewHeight / PREVIEW_ASPECT;

  return {
    previewWidth: Math.round(previewWidth),
    previewHeight: Math.round(previewHeight),
  };
}
