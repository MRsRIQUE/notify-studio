import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  generateEvents,
  generateEventsFromProducts,
} from "./generator";
import { commissionCents } from "./product";
import type { Product } from "./product";

const CATALOGO: Product[] = [
  {
    id: "p1",
    name: "Fone Bluetooth TWS",
    priceCents: 8990,
    commissionBp: 1800,
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  },
  {
    id: "p2",
    name: "Ring Light 26cm",
    priceCents: 12990,
    commissionBp: 1500,
    createdAt: "2026-08-26T00:00:00.000Z",
    updatedAt: "2026-08-26T00:00:00.000Z",
  },
];

describe("generateEventsFromProducts", () => {
  it("e determinista para a mesma seed e catalogo", () => {
    const a = generateEventsFromProducts(CATALOGO, DEFAULT_RULES, 42);
    const b = generateEventsFromProducts(CATALOGO, DEFAULT_RULES, 42);
    expect(a).toEqual(b);
  });

  it("todo evento referencia um produto do catalogo", () => {
    const eventos = generateEventsFromProducts(CATALOGO, DEFAULT_RULES, 7);
    expect(eventos.length).toBeGreaterThan(0);
    const ids = new Set(CATALOGO.map((p) => p.id));
    for (const e of eventos) {
      expect(ids.has(e.productId!)).toBe(true);
    }
  });

  it("copia nome, preco e comissao do produto (snapshot)", () => {
    const eventos = generateEventsFromProducts(CATALOGO, DEFAULT_RULES, 7);
    for (const e of eventos) {
      const p = CATALOGO.find((x) => x.id === e.productId)!;
      expect(e.productName).toBe(p.name);
      expect(e.amountCents).toBe(p.priceCents);
      expect(e.commissionBp).toBe(p.commissionBp);
    }
  });

  it("preserva o timing gerado pelas regras", () => {
    const base = generateEvents(DEFAULT_RULES, 99);
    const comProdutos = generateEventsFromProducts(CATALOGO, DEFAULT_RULES, 99);
    expect(comProdutos.map((e) => e.timeMs)).toEqual(base.map((e) => e.timeMs));
    expect(comProdutos.map((e) => e.quantity)).toEqual(
      base.map((e) => e.quantity),
    );
  });

  it("degrada para o gerador padrao com catalogo vazio", () => {
    const vazio = generateEventsFromProducts([], DEFAULT_RULES, 42);
    expect(vazio).toEqual(generateEvents(DEFAULT_RULES, 42));
    expect(vazio.every((e) => e.productId === undefined)).toBe(true);
  });

  it("a comissao do evento e calculavel a partir do snapshot", () => {
    const eventos = generateEventsFromProducts(CATALOGO, DEFAULT_RULES, 3);
    const e = eventos[0]!;
    const esperado = commissionCents(e.amountCents, e.quantity, e.commissionBp!);
    expect(esperado).toBeGreaterThan(0);
    // Comissao nunca pode superar a receita bruta da venda.
    expect(esperado).toBeLessThanOrEqual(e.amountCents * e.quantity);
  });

  it("usa mais de um produto ao longo de uma timeline suficientemente longa", () => {
    const eventos = generateEventsFromProducts(
      CATALOGO,
      { ...DEFAULT_RULES, durationMs: 120000 },
      11,
    );
    const usados = new Set(eventos.map((e) => e.productId));
    expect(usados.size).toBeGreaterThan(1);
  });
});
