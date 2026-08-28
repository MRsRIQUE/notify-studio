import * as Sharing from "expo-sharing";

// Titulo do dialogo de compartilhamento: repete o aviso obrigatorio para que
// o destinatario veja "demonstracao" antes mesmo de abrir o arquivo.
const DIALOG_TITLE = "Demonstração — dados simulados";

export async function shareFile(
  uri: string,
  mimeType: string,
): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Compartilhamento não disponível neste aparelho.");
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: DIALOG_TITLE,
  });
}

export function shareGif(uri: string): Promise<void> {
  return shareFile(uri, "image/gif");
}
