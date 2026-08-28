import * as ImagePicker from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";

// Fotos de produto ficam num diretorio proprio dentro do storage do app.
// A URI devolvida pelo picker aponta para um arquivo temporario do sistema:
// se guardassemos ela direto, a foto sumiria do catalogo quando o Android
// limpasse o cache.
const PHOTO_DIR = "product-photos";

function photosDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  dir.create({ idempotent: true });
  return dir;
}

function extensionOf(uri: string): string {
  const semQuery = uri.split("?")[0] ?? uri;
  const match = semQuery.match(/\.([a-zA-Z0-9]{1,5})$/);
  return match ? `.${match[1]!.toLowerCase()}` : ".jpg";
}

/**
 * Copia a foto escolhida para o storage do app e devolve a URI definitiva.
 */
export function persistProductPhoto(sourceUri: string, productId: string): string {
  const dir = photosDirectory();
  const destino = new File(dir, `${productId}${extensionOf(sourceUri)}`);
  if (destino.exists) destino.delete();
  new File(sourceUri).copy(destino);
  return destino.uri;
}

/**
 * Abre a galeria do sistema. No Android 13+ isso usa o Photo Picker, que nao
 * exige permissao de armazenamento.
 *
 * Retorna a URI ja persistida no app, ou null se o usuario cancelar.
 */
export async function pickProductPhoto(
  productId: string,
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0]!;
  return persistProductPhoto(asset.uri, productId);
}

/** Remove a foto de um produto, se existir. Silencioso se ja nao houver. */
export function deleteProductPhoto(photoUri?: string): void {
  if (!photoUri) return;
  try {
    const file = new File(photoUri);
    if (file.exists) file.delete();
  } catch {
    // Arquivo ja removido ou inacessivel: nao ha o que fazer.
  }
}
