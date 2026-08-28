import type { SaleEvent } from "./types";
import type { Product } from "./product";

export type GeneratorRules = {
  quantityMin: number;
  quantityMax: number;
  amountMinCents: number;
  amountMaxCents: number;
  intervalMinMs: number;
  intervalMaxMs: number;
  durationMs: number;
  curve: "constant" | "growth" | "burst" | "manual";
};

export const DEFAULT_RULES: GeneratorRules = {
  quantityMin: 1,
  quantityMax: 4,
  amountMinCents: 2990,
  amountMaxCents: 14990,
  intervalMinMs: 4000,
  intervalMaxMs: 12000,
  durationMs: 30000,
  curve: "constant",
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function eventCounter(): () => number {
  let n = 0;
  return () => ++n;
}

export function generateEvents(
  rules: GeneratorRules,
  seed: number,
): SaleEvent[] {
  const rand = mulberry32(seed);
  const nextId = eventCounter();
  const events: SaleEvent[] = [];

  const qMin = clamp(Math.floor(rules.quantityMin), 1, 4);
  const qMax = clamp(Math.floor(rules.quantityMax), qMin, 4);
  const aMin = Math.max(1, Math.floor(rules.amountMinCents));
  const aMax = Math.max(aMin, Math.floor(rules.amountMaxCents));
  const iMin = Math.max(500, Math.floor(rules.intervalMinMs));
  const iMax = Math.max(iMin, Math.floor(rules.intervalMaxMs));
  const duration = Math.max(1000, Math.floor(rules.durationMs));

  const randInt = (min: number, max: number) =>
    min + Math.floor(rand() * (max - min + 1));

  let t = 0;
  let index = 0;
  const total = Math.max(1, Math.floor(duration / iMin));
  while (t <= duration && events.length < 64) {
    const progress = index / Math.max(1, total - 1);
    let interval: number;
    switch (rules.curve) {
      case "growth":
        interval = Math.round(iMax - (iMax - iMin) * progress);
        interval = clamp(interval, iMin, iMax);
        break;
      case "burst":
        interval = progress > 0.6 ? iMin : iMax;
        break;
      default:
        interval = randInt(iMin, iMax);
    }
    if (index > 0) t += interval;
    if (t > duration) break;

    events.push({
      id: `evt-${seed}-${nextId()}`,
      timeMs: t,
      title: "Nova venda demonstrativa",
      storeName: "Loja Exemplo",
      productName: "Produto Exemplo",
      quantity: randInt(qMin, qMax),
      amountCents: randInt(aMin, aMax),
      currency: "BRL",
    });
    index += 1;
  }

  events.sort((a, b) => a.timeMs - b.timeMs);
  return events;
}

export function regenerateEvent(
  event: SaleEvent,
  rules: GeneratorRules,
  seed: number,
): SaleEvent {
  const rand = mulberry32(seed ^ event.id.length * 2654435761);
  const qMin = clamp(Math.floor(rules.quantityMin), 1, 4);
  const qMax = clamp(Math.floor(rules.quantityMax), qMin, 4);
  const aMin = Math.max(1, Math.floor(rules.amountMinCents));
  const aMax = Math.max(aMin, Math.floor(rules.amountMaxCents));
  return {
    ...event,
    quantity: qMin + Math.floor(rand() * (qMax - qMin + 1)),
    amountCents: aMin + Math.floor(rand() * (aMax - aMin + 1)),
  };
}

/**
 * Gera a timeline a partir do catalogo de produtos.
 *
 * Reaproveita generateEvents para o timing (intervalos, curva, quantidade) e
 * so sobrepoe os dados do produto sorteado. O valor deixa de ser aleatorio e
 * passa a ser o preco real cadastrado; nome e comissao vem junto como
 * snapshot, para o evento sobreviver a edicao ou exclusao do produto.
 *
 * Determinista: mesma seed + mesmo catalogo => mesma saida.
 */
export function generateEventsFromProducts(
  products: readonly Product[],
  rules: GeneratorRules,
  seed: number,
): SaleEvent[] {
  const base = generateEvents(rules, seed);
  if (products.length === 0) return base;

  // Stream de aleatoriedade proprio, para a escolha de produto nao deslocar a
  // sequencia usada pelo timing.
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);

  return base.map((event) => {
    const product = products[Math.floor(rand() * products.length)]!;
    return {
      ...event,
      productName: product.name,
      amountCents: product.priceCents,
      productId: product.id,
      commissionBp: product.commissionBp,
    };
  });
}
