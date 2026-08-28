// Catalogo de produtos (estilo TikTok Shop) usado como fonte dos eventos de
// venda simulados. Funcoes puras e deterministas — sem I/O.

export type Product = {
  readonly id: string;
  readonly name: string;
  /** Preco unitario em centavos. Inteiro, nunca negativo. */
  readonly priceCents: number;
  /**
   * Comissao do usuario em basis points (1% = 100 bp).
   * Guardado como inteiro para evitar erro de ponto flutuante ao acumular
   * comissoes de varios eventos.
   */
  readonly commissionBp: number;
  /** URI local da foto. Ausente = produto sem imagem cadastrada. */
  readonly photoUri?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const MAX_COMMISSION_BP = 10000; // 100%

export function percentToBp(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return clampBp(Math.round(percent * 100));
}

export function bpToPercent(bp: number): number {
  return clampBp(bp) / 100;
}

export function clampBp(bp: number): number {
  // NaN nao tem valor significativo -> 0. Infinity, sim: clamp de um valor
  // enorme e o maximo da faixa, nao zero.
  if (Number.isNaN(bp)) return 0;
  if (bp === Infinity) return MAX_COMMISSION_BP;
  if (bp === -Infinity) return 0;
  return Math.min(MAX_COMMISSION_BP, Math.max(0, Math.round(bp)));
}

/**
 * Comissao de uma venda, em centavos.
 *
 * Arredonda uma unica vez sobre o total (preco x quantidade), e nao por
 * unidade: arredondar por unidade e multiplicar acumula erro — 3 unidades de
 * R$ 9,99 a 15% dariam 450 em vez dos 449 corretos.
 */
export function commissionCents(
  priceCents: number,
  quantity: number,
  commissionBp: number,
): number {
  const price = Math.max(0, Math.round(priceCents));
  const qty = Math.max(0, Math.round(quantity));
  const bp = clampBp(commissionBp);
  return Math.round((price * qty * bp) / MAX_COMMISSION_BP);
}

/** Receita bruta da venda, em centavos. */
export function grossCents(priceCents: number, quantity: number): number {
  return Math.max(0, Math.round(priceCents)) * Math.max(0, Math.round(quantity));
}

export function isValidProduct(p: Partial<Product>): boolean {
  if (!p.name || p.name.trim().length === 0) return false;
  if (typeof p.priceCents !== "number" || !Number.isFinite(p.priceCents)) {
    return false;
  }
  if (p.priceCents < 0) return false;
  if (typeof p.commissionBp !== "number" || !Number.isFinite(p.commissionBp)) {
    return false;
  }
  if (p.commissionBp < 0 || p.commissionBp > MAX_COMMISSION_BP) return false;
  return true;
}
