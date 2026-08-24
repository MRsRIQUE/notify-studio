import { describe, expect, it } from "vitest";
import { formatCurrency, eventBody } from "../domain/currency";
import { validateDisclosure, DISCLOSURE_TEXT } from "../domain/disclosure";
import {
  DEFAULT_RULES,
  generateEvents,
  mulberry32,
  regenerateEvent,
} from "../domain/generator";
import type { DisclosureConfig } from "../domain/types";

describe("formatCurrency", () => {
  it("formata BRL em centavos", () => {
    expect(formatCurrency(8970, "BRL")).toContain("89,70");
  });
  it("formata USD corretamente", () => {
    const result = formatCurrency(1299, "USD");
    expect(result).toContain("12");
    expect(result).toContain("99");
  });
  it("rejeita valores negativos", () => {
    expect(() => formatCurrency(-1, "BRL")).toThrow();
  });
  it("rejeita NaN", () => {
    expect(() => formatCurrency(Number.NaN, "BRL")).toThrow();
  });
});

describe("eventBody", () => {
  it("inclui quantidade, produto e valor", () => {
    const body = eventBody({
      quantity: 3,
      amountCents: 2990,
      currency: "BRL",
      productName: "Produto Exemplo",
    });
    expect(body).toContain("3 un.");
    expect(body).toContain("Produto Exemplo");
    expect(body).toContain("29,90");
  });
});

describe("validateDisclosure", () => {
  const base: DisclosureConfig = {
    text: DISCLOSURE_TEXT,
    position: "bottom",
    style: "bar",
  };
  it("aceita disclosure padrão", () => {
    expect(validateDisclosure(base).ok).toBe(true);
  });
  it("rejeita texto vazio", () => {
    expect(
      validateDisclosure({ ...base, text: "" as never }).ok,
    ).toBe(false);
  });
  it("rejeita texto alterado", () => {
    expect(
      validateDisclosure({ ...base, text: "outra coisa" as never }).ok,
    ).toBe(false);
  });
  it("rejeita quando está fora da área visível", () => {
    const result = validateDisclosure(base, {
      height: 1920,
      barY: 1900,
      barHeight: 60,
    });
    expect(result.ok).toBe(false);
  });
});

describe("generateEvents", () => {
  it("é determinístico com a mesma seed", () => {
    const a = generateEvents(DEFAULT_RULES, 42);
    const b = generateEvents(DEFAULT_RULES, 42);
    expect(a).toEqual(b);
  });
  it("varia com seeds diferentes", () => {
    const a = generateEvents(DEFAULT_RULES, 42);
    const b = generateEvents(DEFAULT_RULES, 43);
    expect(a).not.toEqual(b);
  });
  it("respeita limites de quantidade e valor", () => {
    const events = generateEvents(DEFAULT_RULES, 7);
    for (const e of events) {
      expect(e.quantity).toBeGreaterThanOrEqual(1);
      expect(e.quantity).toBeLessThanOrEqual(4);
      expect(e.amountCents).toBeGreaterThanOrEqual(2990);
      expect(e.amountCents).toBeLessThanOrEqual(14990);
    }
  });
  it("mantém eventos ordenados e dentro da duração", () => {
    const events = generateEvents(DEFAULT_RULES, 9);
    const times = events.map((e) => e.timeMs);
    expect([...times].sort((x, y) => x - y)).toEqual(times);
    for (const t of times) {
      expect(t).toBeLessThanOrEqual(DEFAULT_RULES.durationMs);
    }
  });
  it("nunca gera valores negativos com regras inválidas", () => {
    const events = generateEvents(
      { ...DEFAULT_RULES, quantityMin: -5, amountMinCents: -100 },
      3,
    );
    for (const e of events) {
      expect(e.quantity).toBeGreaterThan(0);
      expect(e.amountCents).toBeGreaterThan(0);
    }
  });
});

describe("mulberry32", () => {
  it("produz valores em [0, 1)", () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("regenerateEvent", () => {
  it("preserva id e timeMs, muda valores dentro dos limites", () => {
    const events = generateEvents(DEFAULT_RULES, 11);
    const event = events[0];
    const regenerated = regenerateEvent(event, DEFAULT_RULES, 99);
    expect(regenerated.id).toBe(event.id);
    expect(regenerated.timeMs).toBe(event.timeMs);
    expect(regenerated.quantity).toBeGreaterThanOrEqual(1);
    expect(regenerated.quantity).toBeLessThanOrEqual(4);
  });
});
