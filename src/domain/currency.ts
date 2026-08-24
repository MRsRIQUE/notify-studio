const FORMAT_MAP: Record<string, Intl.NumberFormatOptions> = {
  BRL: { style: "currency", currency: "BRL" },
  USD: { style: "currency", currency: "USD" },
  EUR: { style: "currency", currency: "EUR" },
};

export function formatCurrency(amountCents: number, currency: string): string {
  if (!Number.isFinite(amountCents)) {
    throw new Error("amountCents must be a finite number");
  }
  if (amountCents < 0) {
    throw new Error("amountCents must not be negative");
  }
  const opts = FORMAT_MAP[currency];
  if (!opts) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return new Intl.NumberFormat("pt-BR", opts).format(amountCents / 100);
}

export function eventBody(event: {
  quantity: number;
  productName: string;
  amountCents: number;
  currency: string;
}): string {
  const price = formatCurrency(event.amountCents, event.currency);
  return `${event.quantity} un. ${event.productName} — ${price}`;
}
