import AsyncStorage from "@react-native-async-storage/async-storage";

const HANDLE_KEY = "notify-studio-handle";
const SELECAO_KEY = "notify-studio-produtos-selecionados";

/**
 * Normaliza o @ digitado: remove espacos, arroba repetida e caracteres que o
 * TikTok nao aceita em nome de usuario (permitidos: letras, numeros, ponto e
 * underscore). Devolve sem o "@" — quem exibe decide o prefixo.
 */
export function normalizeHandle(input: string): string {
  return input
    .trim()
    .replace(/^@+/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 24);
}

export async function getHandle(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(HANDLE_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function setHandle(handle: string): Promise<void> {
  await AsyncStorage.setItem(HANDLE_KEY, normalizeHandle(handle));
}

/**
 * Produtos escolhidos para a simulacao.
 *
 * Numa live normalmente se divulga um produto por vez, entao a selecao e
 * persistida: reabrir o app nao deve reembaralhar o catalogo inteiro.
 */
export async function getSelectedProductIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SELECAO_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function setSelectedProductIds(ids: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(SELECAO_KEY, JSON.stringify([...ids]));
}
