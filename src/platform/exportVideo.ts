import type { Project } from "../domain/types";
import type { VisualSpec } from "../rendering/drawNotification";

export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

export type VideoExportProgress = {
  phase: "render" | "encode";
  progress: number;
};

export type VideoExportOptions = {
  onProgress?: (p: VideoExportProgress) => void;
  signal?: AbortSignal;
};

export type VideoExportResult = {
  uri: string;
  frameCount: number;
  durationMs: number;
};

export class ExportCancelledError extends Error {
  constructor() {
    super("Exportacao cancelada.");
    this.name = "ExportCancelledError";
  }
}

export class InsufficientDiskSpaceError extends Error {
  constructor(freeBytes: number, neededBytes: number) {
    super(
      `Espaco insuficiente: ${Math.round(
        freeBytes / 1024 / 1024,
      )} MB livres, ${Math.round(neededBytes / 1024 / 1024)} MB necessarios.`,
    );
    this.name = "InsufficientDiskSpaceError";
  }
}

export class VideoEncodingUnavailableError extends Error {
  constructor() {
    super(
      "Codificador MP4 indisponivel neste ambiente. Use a exportacao em PNG.",
    );
    this.name = "VideoEncodingUnavailableError";
  }
}

export function buildRenderSpec(project: Project): VisualSpec {
  return {
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    style: project.platformStyle,
    theme: project.theme,
    disclosure: project.disclosure,
  };
}

// NOTA (ffmpeg-kit removido): O ffmpeg-kit-react-native foi removido porque
// os artifacts Maven do Arthenica foram discontinuados (404). A exportacao
// animada agora usa sempre GIF (omggif, puro JS) como fallback seguro.
// O encode MP4 nativo pode ser reintegrado no futuro via expo-video ou
// outra biblioteca ativa, quando necessario.
export async function videoExportSupported(): Promise<boolean> {
  return false;
}

export async function exportVideo(
  _project: Project,
  _options?: VideoExportOptions,
): Promise<VideoExportResult> {
  throw new VideoEncodingUnavailableError();
}
