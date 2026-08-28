export type PlatformStyle = "ios-inspired" | "android-inspired" | "generic";
export type ProjectFormat = "vertical-9x16" | "square-1x1" | "feed-4x5";
export type TimelineMode = "single" | "regular" | "burst" | "growth" | "manual";

export type DisclosureConfig = {
  readonly text: "Demonstra\u00e7\u00e3o \u2014 dados simulados";
  readonly position: "top" | "bottom";
  readonly style: "bar" | "badge";
};

export const DEFAULT_DISCLOSURE: DisclosureConfig = {
  text: "Demonstra\u00e7\u00e3o \u2014 dados simulados",
  position: "bottom",
  style: "bar",
} as const;

export type SaleEvent = {
  readonly id: string;
  readonly timeMs: number;
  readonly title: string;
  readonly storeName: string;
  readonly productName: string;
  readonly quantity: number;
  readonly amountCents: number;
  readonly currency: "BRL" | "USD" | "EUR";
  readonly buyerAlias?: string;
  readonly soundId?: string;
  /** Produto do catalogo que originou o evento (ausente em eventos manuais). */
  readonly productId?: string;
  /**
   * Comissao em basis points copiada do produto no momento em que o evento foi
   * criado. E um snapshot de proposito: editar o produto depois nao deve
   * reescrever eventos ja montados na timeline.
   */
  readonly commissionBp?: number;
};

// "auto" segue a paleta do tema (padrao); "solid"/"gradient" usam as cores
// escolhidas pelo usuario e sobrescrevem o fundo da paleta.
export type BackgroundConfig = {
  readonly kind: "auto" | "solid" | "gradient";
  readonly color: string;
  readonly colorEnd?: string;
};

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  kind: "auto",
  color: "#F2F2F7",
} as const;

export type Project = {
  readonly id: string;
  readonly name: string;
  readonly format: ProjectFormat;
  readonly platformStyle: PlatformStyle;
  readonly theme: "light" | "dark";
  readonly background: BackgroundConfig;
  readonly disclosure: DisclosureConfig;
  readonly timelineMode: TimelineMode;
  readonly events: readonly SaleEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly schemaVersion: number;
};
