import type { Project } from "../domain/types";
import { exportGif, type GifExportOptions } from "./exportGif";

export type AnimatedExportKind = "gif";

export type AnimatedExportResult = {
  kind: AnimatedExportKind;
  uri: string;
  frameCount: number;
  durationMs: number;
  mimeType: string;
};

export type AnimatedExportOptions = {
  onProgress?: (p: { phase: "render" | "encode"; progress: number }) => void;
  signal?: AbortSignal;
};

// Exportacao animada: sempre GIF (omggif, puro JS).
// O ffmpeg-kit-react-native foi removido porque os artifacts Maven do Arthenica
// foram discontinuados. GIF e seguro, offline, sem dependencias nativas.
export async function exportAnimated(
  project: Project,
  options?: AnimatedExportOptions,
): Promise<AnimatedExportResult> {
  const gifOptions: GifExportOptions = {
    signal: options?.signal,
    onProgress: (progress) =>
      options?.onProgress?.({ phase: "render", progress }),
  };
  const result = await exportGif(project, gifOptions);
  return {
    kind: "gif",
    uri: result.uri,
    frameCount: result.frameCount,
    durationMs: result.durationMs,
    mimeType: "image/gif",
  };
}
