import AsyncStorage from "@react-native-async-storage/async-storage";
import { TERMS_VERSION } from "./documents";

// Armazenamento local do aceite dos termos (guardrail do handoff): guarda a
// versao do termo aceito e a data. Storage injetavel para testes.

const TERMS_KEY = "notify-studio-accepted-terms";

export type TermsAcceptance = {
  readonly version: string;
  readonly acceptedAt: string;
};

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export function needsAcceptance(
  accepted: TermsAcceptance | null,
  currentVersion: string = TERMS_VERSION,
): boolean {
  if (!accepted) return true;
  return accepted.version !== currentVersion;
}

function parseAcceptance(raw: string | null): TermsAcceptance | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; acceptedAt?: unknown };
    if (typeof parsed.version !== "string" || typeof parsed.acceptedAt !== "string") {
      return null;
    }
    return { version: parsed.version, acceptedAt: parsed.acceptedAt };
  } catch {
    return null;
  }
}

export async function getAcceptedTerms(
  storage: KeyValueStorage = AsyncStorage,
): Promise<TermsAcceptance | null> {
  const raw = await storage.getItem(TERMS_KEY);
  return parseAcceptance(raw);
}

export async function acceptCurrentTerms(
  storage: KeyValueStorage = AsyncStorage,
): Promise<TermsAcceptance> {
  const acceptance: TermsAcceptance = {
    version: TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await storage.setItem(TERMS_KEY, JSON.stringify(acceptance));
  return acceptance;
}
