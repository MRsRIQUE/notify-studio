import type { Product } from "./product";

// Produtos de exemplo, semeados na primeira execucao para o catalogo nao
// nascer vazio. Sao ficticios de proposito: nomes genericos de categorias
// comuns de social commerce, sem marca real e sem foto (photoUri ausente),
// para nao embutir imagem de produto de terceiro no app.
//
// Comissao em basis points (1500 = 15%).

export type SampleProduct = Omit<Product, "createdAt" | "updatedAt">;

export const SAMPLE_PRODUCTS: readonly SampleProduct[] = [
  {
    id: "sample-fone-bt",
    name: "Fone Bluetooth TWS",
    priceCents: 8990,
    commissionBp: 1800,
  },
  {
    id: "sample-ring-light",
    name: "Ring Light 26cm com Tripé",
    priceCents: 12990,
    commissionBp: 1500,
  },
  {
    id: "sample-serum",
    name: "Sérum Facial Vitamina C",
    priceCents: 4990,
    commissionBp: 2500,
  },
  {
    id: "sample-caneca",
    name: "Caneca Térmica 500ml",
    priceCents: 6790,
    commissionBp: 1200,
  },
  {
    id: "sample-organizador",
    name: "Organizador de Gavetas (6 peças)",
    priceCents: 3590,
    commissionBp: 2000,
  },
  {
    id: "sample-smartwatch",
    name: "Smartwatch Fitness",
    priceCents: 19900,
    commissionBp: 1000,
  },
  {
    id: "sample-base",
    name: "Base Matte Alta Cobertura",
    priceCents: 5490,
    commissionBp: 2800,
  },
  {
    id: "sample-suporte",
    name: "Suporte Veicular Magnético",
    priceCents: 2990,
    commissionBp: 2200,
  },
];
