import type { SaleEvent, TimelineMode } from "./types";

export type Template = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly events: readonly SaleEvent[];
  readonly timelineMode: TimelineMode;
  readonly seed: number;
};

export const TEMPLATES: readonly Template[] = [
  {
    id: "tpl-single-sale",
    name: "Venda individual",
    description: "Uma unica notificacao de venda demonstrativa",
    seed: 100,
    timelineMode: "single",
    events: [
      {
        id: "evt-tpl-single-1",
        timeMs: 0,
        title: "Nova venda demonstrativa",
        storeName: "Loja Exemplo",
        productName: "Produto Exemplo",
        quantity: 1,
        amountCents: 8970,
        currency: "BRL",
        buyerAlias: "Cliente A",
      },
    ],
  },
  {
    id: "tpl-multi-units",
    name: "Multiplas unidades",
    description: "Venda com mais de uma unidade do mesmo produto",
    seed: 200,
    timelineMode: "single",
    events: [
      {
        id: "evt-tpl-multi-1",
        timeMs: 0,
        title: "Nova venda demonstrativa",
        storeName: "Loja Virtual",
        productName: "Curso Completo",
        quantity: 3,
        amountCents: 14990,
        currency: "BRL",
        buyerAlias: "Comprador B",
      },
    ],
  },
  {
    id: "tpl-daily-goal",
    name: "Meta demonstrativa atingida",
    description: "Notificacao de meta diaria alcancada",
    seed: 300,
    timelineMode: "single",
    events: [
      {
        id: "evt-tpl-goal-1",
        timeMs: 0,
        title: "Meta diaria demonstrativa atingida!",
        storeName: "Demo Shop",
        productName: "Resumo do dia",
        quantity: 1,
        amountCents: 50000,
        currency: "BRL",
      },
    ],
  },
  {
    id: "tpl-order-sequence",
    name: "Sequencia de pedidos",
    description: "Multiplas vendas em sequencia rapida",
    seed: 400,
    timelineMode: "burst",
    events: [
      {
        id: "evt-tpl-seq-1",
        timeMs: 0,
        title: "Nova venda demonstrativa",
        storeName: "Loja Exemplo",
        productName: "E-book Demo",
        quantity: 1,
        amountCents: 4990,
        currency: "BRL",
      },
      {
        id: "evt-tpl-seq-2",
        timeMs: 5000,
        title: "Nova venda demonstrativa",
        storeName: "Loja Exemplo",
        productName: "Plano Basico",
        quantity: 2,
        amountCents: 9990,
        currency: "BRL",
      },
      {
        id: "evt-tpl-seq-3",
        timeMs: 9000,
        title: "Nova venda demonstrativa",
        storeName: "Loja Exemplo",
        productName: "Servico Premium",
        quantity: 1,
        amountCents: 12990,
        currency: "BRL",
      },
    ],
  },
  {
    id: "tpl-daily-summary",
    name: "Resumo demonstrativo do dia",
    description: "Resumo de vendas do dia com total",
    seed: 500,
    timelineMode: "regular",
    events: [
      {
        id: "evt-tpl-sum-1",
        timeMs: 0,
        title: "Nova venda demonstrativa",
        storeName: "Minha Loja",
        productName: "Produto A",
        quantity: 2,
        amountCents: 7980,
        currency: "BRL",
      },
      {
        id: "evt-tpl-sum-2",
        timeMs: 8000,
        title: "Nova venda demonstrativa",
        storeName: "Minha Loja",
        productName: "Produto B",
        quantity: 1,
        amountCents: 3990,
        currency: "BRL",
      },
      {
        id: "evt-tpl-sum-3",
        timeMs: 16000,
        title: "Resumo do dia demonstrativo",
        storeName: "Minha Loja",
        productName: "Total: 7 vendas",
        quantity: 1,
        amountCents: 42500,
        currency: "BRL",
      },
    ],
  },
  {
    id: "tpl-cart",
    name: "Carrinho demonstrativo",
    description: "Notificacao de item adicionado ao carrinho (demo)",
    seed: 600,
    timelineMode: "single",
    events: [
      {
        id: "evt-tpl-cart-1",
        timeMs: 0,
        title: "Item adicionado ao carrinho (demo)",
        storeName: "Loja Exemplo",
        productName: "Produto Demo",
        quantity: 1,
        amountCents: 7990,
        currency: "BRL",
        buyerAlias: "Usuario Exemplo",
      },
    ],
  },
  {
    id: "tpl-subscription",
    name: "Assinatura confirmada (demo)",
    description: "Confirmacao de assinatura recorrente (demo)",
    seed: 700,
    timelineMode: "single",
    events: [
      {
        id: "evt-tpl-sub-1",
        timeMs: 0,
        title: "Assinatura confirmada (demo)",
        storeName: "Loja Exemplo",
        productName: "Plano Premium Demo",
        quantity: 1,
        amountCents: 29990,
        currency: "BRL",
        buyerAlias: "Assinante Exemplo",
      },
    ],
  },
  {
    id: "tpl-review",
    name: "Avaliacao recebida (demo)",
    description: "Notificacao de nova avaliacao de cliente (demo)",
    seed: 800,
    timelineMode: "single",
    events: [
      {
        id: "evt-tpl-rev-1",
        timeMs: 0,
        title: "Nova avaliacao recebida (demo)",
        storeName: "Loja Exemplo",
        productName: "Produto Exemplo",
        quantity: 1,
        amountCents: 0,
        currency: "BRL",
        buyerAlias: "Avaliador Exemplo",
      },
    ],
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
