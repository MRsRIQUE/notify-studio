import { Skia } from "@shopify/react-native-skia";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
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

  const surface = Skia.Surface.MakeOffscreen(EXPORT_WIDTH, EXPORT_HEIGHT);
  if (!surface) {
    throw new Error(
      "Superficie de renderizacao indisponivel (GPU necessaria). " +
        "Exportacao PNG requer aparelho com GPU real.",
    );
  }
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
        `minimo esperado ~${MIN_PNG_BYTES}). Provavelmente a superficie ` +
        `de renderizacao nao possui GPU. Tente em aparelho fisico.`,
    );
  }

  const file = new File(Paths.cache, `notify-studio-${Date.now()}.png`);
  file.write(bytes);
  return file.uri;
}

export async function sharePng(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Compartilhamento não disponível neste aparelho.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    dialogTitle: "Demonstração — dados simulados",
  });
}
