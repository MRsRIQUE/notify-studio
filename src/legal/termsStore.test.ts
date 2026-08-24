import { describe, expect, it } from "vitest";
import {
  getAcceptedTerms,
  acceptCurrentTerms,
  needsAcceptance,
  type KeyValueStorage,
} from "./termsStore";
import { TERMS_VERSION, PRIVACY_POLICY, TERMS_OF_USE } from "./documents";

function fakeStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
  };
}

describe("termsStore", () => {
  it("sem aceite registrado exige aceite", () => {
    expect(needsAcceptance(null)).toBe(true);
  });

  it("versao aceita igual a corrente nao exige novo aceite", () => {
    expect(
      needsAcceptance({ version: TERMS_VERSION, acceptedAt: "2026-01-01" }),
    ).toBe(false);
  });

  it("versao aceita diferente da corrente exige novo aceite", () => {
    expect(
      needsAcceptance(
        { version: "0.9.0", acceptedAt: "2026-01-01" },
        TERMS_VERSION,
      ),
    ).toBe(true);
  });

  it("getAcceptedTerms retorna null quando vazio", async () => {
    const storage = fakeStorage();
    expect(await getAcceptedTerms(storage)).toBeNull();
  });

  it("getAcceptedTerms ignora payload invalido", async () => {
    const storage = fakeStorage();
    storage.map.set("notify-studio-accepted-terms", "lixo{{{");
    expect(await getAcceptedTerms(storage)).toBeNull();
    storage.map.set(
      "notify-studio-accepted-terms",
      JSON.stringify({ version: 1, acceptedAt: null }),
    );
    expect(await getAcceptedTerms(storage)).toBeNull();
  });

  it("acceptCurrentTerms grava e devolve o aceite com versao corrente", async () => {
    const storage = fakeStorage();
    const acceptance = await acceptCurrentTerms(storage);
    expect(acceptance.version).toBe(TERMS_VERSION);
    expect(acceptance.acceptedAt).toBeTruthy();

    const stored = await getAcceptedTerms(storage);
    expect(stored).not.toBeNull();
    expect(stored!.version).toBe(TERMS_VERSION);
    expect(needsAcceptance(stored)).toBe(false);
  });

  it("novo aceite apos bump de versao limpa a pendencia", async () => {
    const storage = fakeStorage();
    await acceptCurrentTerms(storage);
    // Simula bump de versao do termo
    expect(needsAcceptance(await getAcceptedTerms(storage), "2.0.0")).toBe(true);
    // Usuario reaceita
    const again = await acceptCurrentTerms(storage);
    expect(again.version).toBe(TERMS_VERSION);
  });
});

describe("documentos legais", () => {
  it("politica e termos compartilham a mesma versao", () => {
    expect(PRIVACY_POLICY.version).toBe(TERMS_VERSION);
    expect(TERMS_OF_USE.version).toBe(TERMS_VERSION);
  });

  it("politica menciona ausencia de coleta e dados simulados", () => {
    const privacy = JSON.stringify(PRIVACY_POLICY);
    expect(privacy).toContain("não coleta");
    expect(privacy).toContain("simulados");
    expect(privacy).toContain("offline");
  });

  it("termos incluem aviso de uso etico e aviso obrigatorio", () => {
    const terms = JSON.stringify(TERMS_OF_USE);
    expect(terms).toContain("Uso ético");
    expect(terms).toContain("Demonstração — dados simulados");
  });
});
