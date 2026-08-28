import { describe, expect, it } from "vitest";
import {
  bpToPercent,
  clampBp,
  commissionCents,
  grossCents,
  isValidProduct,
  MAX_COMMISSION_BP,
  percentToBp,
  type Product,
} from "./product";

const base: Product = {
  id: "prod-1",
  name: "Fone Bluetooth",
  priceCents: 9990,
  commissionBp: 1500, // 15%
  createdAt: "2026-08-26T00:00:00.000Z",
  updatedAt: "2026-08-26T00:00:00.000Z",
};

describe("conversao percentual <-> basis points", () => {
  it("converte nos dois sentidos sem perder valor", () => {
    for (const pct of [0, 1, 7.5, 15, 33.33, 100]) {
      expect(bpToPercent(percentToBp(pct))).toBeCloseTo(pct, 2);
    }
  });

  it("limita a faixa 0..100%", () => {
    expect(percentToBp(-10)).toBe(0);
    expect(percentToBp(150)).toBe(MAX_COMMISSION_BP);
    expect(clampBp(99999)).toBe(MAX_COMMISSION_BP);
    expect(clampBp(-5)).toBe(0);
  });

  it("nao quebra com valores nao finitos", () => {
    expect(percentToBp(NaN)).toBe(0);
    expect(clampBp(Infinity)).toBe(MAX_COMMISSION_BP);
    expect(clampBp(NaN)).toBe(0);
  });
});

describe("commissionCents", () => {
  it("calcula a comissao sobre o total da venda", () => {
    // 15% de R$ 99,90 = R$ 14,985 -> 1499 centavos
    expect(commissionCents(9990, 1, 1500)).toBe(1499);
  });

  it("arredonda uma vez sobre o total, nao por unidade", () => {
    // 3 x R$ 9,99 a 15%: total 2997 * 0.15 = 449,55 -> 450.
    // Por unidade seria round(149,85)=150 -> 450. Caso que diverge:
    // 3 x R$ 3,33 a 10%: total 999 * 0,10 = 99,9 -> 100.
    // Por unidade: round(33,3)=33 -> 99. Confirma o arredondamento unico.
    expect(commissionCents(333, 3, 1000)).toBe(100);
  });

  it("comissao zero e comissao total", () => {
    expect(commissionCents(9990, 2, 0)).toBe(0);
    expect(commissionCents(9990, 2, MAX_COMMISSION_BP)).toBe(19980);
  });

  it("nunca retorna negativo", () => {
    expect(commissionCents(-100, 5, 1500)).toBe(0);
    expect(commissionCents(9990, -3, 1500)).toBe(0);
  });

  it("e determinista", () => {
    expect(commissionCents(9990, 3, 1500)).toBe(
      commissionCents(9990, 3, 1500),
    );
  });
});

describe("grossCents", () => {
  it("multiplica preco por quantidade", () => {
    expect(grossCents(9990, 3)).toBe(29970);
  });

  it("trata entradas invalidas como zero", () => {
    expect(grossCents(-1, 3)).toBe(0);
    expect(grossCents(9990, -1)).toBe(0);
  });
});

describe("isValidProduct", () => {
  it("aceita um produto bem formado", () => {
    expect(isValidProduct(base)).toBe(true);
  });

  it("rejeita nome vazio ou so espacos", () => {
    expect(isValidProduct({ ...base, name: "" })).toBe(false);
    expect(isValidProduct({ ...base, name: "   " })).toBe(false);
  });

  it("rejeita preco negativo ou nao numerico", () => {
    expect(isValidProduct({ ...base, priceCents: -1 })).toBe(false);
    expect(isValidProduct({ ...base, priceCents: NaN })).toBe(false);
  });

  it("rejeita comissao fora de 0..100%", () => {
    expect(isValidProduct({ ...base, commissionBp: -1 })).toBe(false);
    expect(
      isValidProduct({ ...base, commissionBp: MAX_COMMISSION_BP + 1 }),
    ).toBe(false);
  });

  it("aceita produto sem foto", () => {
    expect(isValidProduct({ ...base, photoUri: undefined })).toBe(true);
  });
});
