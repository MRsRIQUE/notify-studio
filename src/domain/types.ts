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
};

export type BackgroundConfig = {
  readonly kind: "solid" | "gradient";
  readonly color: string;
  readonly colorEnd?: string;
};

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
