import { describe, expect, it } from "vitest";
import { saleTitle, saleBody, SIMULATION_MARKER } from "./saleCopy";
import { normalizeHandle } from "../state/settings";
import type { SaleEvent } from "./types";

const evento: SaleEvent = {
  id: "e1",
  timeMs: 0,
  title: "irrelevante",
  storeName: "Loja",
  productName: "Fone Bluetooth TWS",
  quantity: 3,
  amountCents: 8990,
  currency: "BRL",
  commissionBp: 1800,
};

describe("saleTitle", () => {
  it("usa o @ configurado", () => {
    expect(saleTitle("joaovendas")).toBe(
      "Sua conta @joaovendas acaba de realizar uma venda",
    );
  });

  it("nao duplica o arroba se o usuario digitar", () => {
    expect(saleTitle("@joaovendas")).toBe(
      "Sua conta @joaovendas acaba de realizar uma venda",
    );
  });

  it("cai para frase generica sem @, sem deixar arroba solto", () => {
    expect(saleTitle("")).toBe("Você acaba de realizar uma venda");
    expect(saleTitle("   ")).not.toContain("@");
  });
});

describe("saleBody", () => {
  it("mostra quantidade, produto, total e comissao", () => {
    const body = saleBody(evento);
    expect(body).toContain("3x Fone Bluetooth TWS");
    expect(body).toContain("comissão");
  });

  it("omite a comissao quando o produto nao tem percentual", () => {
    const semComissao = { ...evento, commissionBp: 0 };
    expect(saleBody(semComissao)).not.toContain("comissão");
  });

  it("o total considera a quantidade", () => {
    // 3 x R$ 89,90 = R$ 269,70
    expect(saleBody(evento)).toContain("269,70");
  });
});

describe("normalizeHandle", () => {
  it("remove arroba, espacos e caracteres invalidos", () => {
    expect(normalizeHandle("  @joao.vendas_01 ")).toBe("joao.vendas_01");
    expect(normalizeHandle("@@ma ria!#")).toBe("maria");
  });

  it("limita o tamanho", () => {
    expect(normalizeHandle("a".repeat(50)).length).toBe(24);
  });
});

describe("marcador de simulacao", () => {
  it("existe e nao e vazio", () => {
    expect(SIMULATION_MARKER.trim().length).toBeGreaterThan(0);
  });
});
