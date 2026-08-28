import { File, Paths } from "expo-file-system";
import { shareFile } from "./share";
import { makeRenderSurface } from "../rendering/surface";
import {
  assertDisclosureVisible,
  drawNotification,
  type RenderSpec,
} from "../rendering/drawNotification";

export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1920;

export async function exportPng(spec: RenderSpec): Promise<string> {
  const exportSpec: RenderSpec = {
    ...spec,
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
  };
  assertDisclosureVisible(exportSpec);

  const surface = makeRenderSurface(EXPORT_WIDTH, EXPORT_HEIGHT);
  const canvas = surface.getCanvas();
  drawNotification(canvas, exportSpec);
  const image = surface.makeImageSnapshot();
  const bytes = image.encodeToBytes();
  image.dispose();
  surface.dispose();

  // Smoke assertion: PNG 1080x1920 com conteudo real deve ter > 10KB.
  // Arquivos menores indicam renderizacao vazia (GPU ausente ou falha).
  const MIN_PNG_BYTES = 10 * 1024;
  if (bytes.byteLength < MIN_PNG_BYTES) {
    throw new Error(
      `PNG gerado suspeitamente pequeno (${bytes.byteLength} bytes, ` +
        `minimo esperado ~${MIN_PNG_BYTES}). A renderizacao provavelmente ` +
        `saiu vazia.`,
    );
  }

  const file = new File(Paths.cache, `notify-studio-${Date.now()}.png`);
  file.write(bytes);
  return file.uri;
}

export function sharePng(uri: string): Promise<void> {
  return shareFile(uri, "image/png");
}
