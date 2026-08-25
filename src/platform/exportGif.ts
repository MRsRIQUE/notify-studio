import { Skia, ColorType, AlphaType } from "@shopify/react-native-skia";
import { File, Directory, Paths } from "expo-file-system";
import type { Project } from "../domain/types";
import type { VisualSpec } from "../rendering/drawNotification";
import { assertDisclosureVisible } from "../rendering/drawNotification";
import { composeFrame } from "../rendering/frameComposer";
import { frameTimeMs, videoDurationMs } from "../domain/timeline";
import { encodeGif, rgbaToIndexed, type GifFrame } from "../rendering/gifEncoder";
import { ExportCancelledError } from "./exportErrors";

export const GIF_WIDTH = 540;
export const GIF_HEIGHT = 960;
export const GIF_FPS = 12;
export const GIF_MAX_DURATION_MS = 10000;

export type GifExportOptions = {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

export type GifExportResult = {
  uri: string;
  frameCount: number;
  durationMs: number;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ExportCancelledError();
}

export function buildGifSpec(project: Project): VisualSpec {
  return {
    width: GIF_WIDTH,
    height: GIF_HEIGHT,
    style: project.platformStyle,
    theme: project.theme,
    disclosure: project.disclosure,
  };
}

function renderFramePixels(
  project: Project,
  spec: VisualSpec,
  timeMs: number,
): Uint8Array {
  const surface = Skia.Surface.MakeOffscreen(spec.width, spec.height);
  if (!surface) {
    throw new Error("Nao foi possivel criar a superficie de renderizacao.");
  }
  const canvas = surface.getCanvas();
  composeFrame(
    canvas,
    { width: spec.width, height: spec.height, project },
    timeMs,
  );
  const image = surface.makeImageSnapshot();
  const pixels = image.readPixels(
    0,
    0,
    {
      width: spec.width,
      height: spec.height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Opaque,
    },
  );
  image.dispose();
  surface.dispose();
  if (!pixels) {
    throw new Error("Nao foi possivel ler os pixels do frame.");
  }
  return pixels as Uint8Array;
}

export async function exportGif(
  project: Project,
  options?: GifExportOptions,
): Promise<GifExportResult> {
  const { onProgress, signal } = options ?? {};
  if (project.events.length === 0) {
    throw new Error("Projeto sem eventos para exportar.");
  }

  const spec = buildGifSpec(project);
  assertDisclosureVisible(spec);

  const fullDurationMs = videoDurationMs(project.events);
  const durationMs = Math.min(fullDurationMs, GIF_MAX_DURATION_MS);
  const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * GIF_FPS));
  const frameDelayCentiseconds = Math.max(2, Math.round(100 / GIF_FPS));

  const stamp = Date.now();
  const workDir = new Directory(Paths.cache, `ns-gif-${stamp}`);
  workDir.create({ idempotent: true });
  const outputFile = new File(Paths.cache, `ns-anim-${stamp}.gif`);

  try {
    const frames: GifFrame[] = [];
    for (let i = 0; i < frameCount; i++) {
      throwIfAborted(signal);
      const t = frameTimeMs(i, GIF_FPS);
      const pixels = renderFramePixels(project, spec, t);
      frames.push({
        indexedPixels: rgbaToIndexed(pixels),
        delayCentiseconds: frameDelayCentiseconds,
      });
      onProgress?.((i + 1) / frameCount);
      if (i % 3 === 0) {
        await new Promise<number>((r) => setTimeout(r, 0));
      }
    }

    throwIfAborted(signal);

    const bytes = encodeGif(GIF_WIDTH, GIF_HEIGHT, frames);

    // Smoke assertion: GIF animado deve ter > 5KB.
    // Arquivos menores indicam renderizacao vazia (GPU ausente ou falha).
    const MIN_GIF_BYTES = 5 * 1024;
    if (bytes.byteLength < MIN_GIF_BYTES) {
      throw new Error(
        `GIF gerado suspeitamente pequeno (${bytes.byteLength} bytes, ` +
          `minimo esperado ~${MIN_GIF_BYTES}). Provavelmente a superficie ` +
          `de renderizacao nao possui GPU. Tente em aparelho fisico.`,
      );
    }

    outputFile.write(bytes);

    return {
      uri: outputFile.uri,
      frameCount,
      durationMs,
    };
  } catch (err) {
    if (outputFile.exists) {
      try {
        outputFile.delete();
      } catch {
        // ignore cleanup errors
      }
    }
    throw err;
  } finally {
    if (workDir.exists) {
      try {
        workDir.delete();
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
