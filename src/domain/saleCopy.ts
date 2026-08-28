import { formatCurrency } from "./currency";
import { commissionCents } from "./product";
import type { SaleEvent } from "./types";

// Texto das notificacoes de venda. Funcoes puras — o modulo de plataforma so
// entrega o resultado ao agendador.

export const SIMULATION_MARKER = "Simulação";

/**
 * Titulo da notificacao.
 *
 * Com @ configurado: "Sua conta @fulano acaba de realizar uma venda".
 * Sem @: cai numa frase generica, para nao exibir "@" solto.
 */
export function saleTitle(handle: string): string {
  const limpo = handle.trim().replace(/^@+/, "");
  return limpo.length > 0
    ? `Sua conta @${limpo} acaba de realizar uma venda`
    : "Você acaba de realizar uma venda";
}

/**
 * Corpo: quantidade, produto, total e — quando o produto tem comissao
 * cadastrada — quanto o usuario ganhou naquela venda.
 */
export function saleBody(event: SaleEvent): string {
  const total = formatCurrency(
    event.amountCents * event.quantity,
    event.currency,
  );
  const base = `${event.quantity}x ${event.productName} — ${total}`;

  if (event.commissionBp && event.commissionBp > 0) {
    const comissao = commissionCents(
      event.amountCents,
      event.quantity,
      event.commissionBp,
    );
    return `${base} · comissão ${formatCurrency(comissao, event.currency)}`;
  }
  return base;
}
