import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_BACKGROUND, DEFAULT_DISCLOSURE } from "../domain/types";
import type { Project, SaleEvent } from "../domain/types";
import type { Product } from "../domain/product";
import { SAMPLE_PRODUCTS } from "../domain/sampleProducts";

/**
 * expo-sqlite nao existe fora do aparelho, mas trocar a camada por um mock que
 * so devolve objetos nao testaria nada do que importa aqui: as migrations, a
 * ordenacao por sort_order, a limpeza dos eventos ao apagar o projeto e o
 * desvinculo do produto sao comportamento do SQL. Entao o mock e um adaptador
 * fino sobre o SQLite real do Node — a assincronia do expo por cima de um
 * banco em memoria.
 */
let raw: DatabaseSync;

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: async () => ({
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, params: unknown[] = []) => {
      raw.prepare(sql).run(...(params as never[]));
    },
    getAllAsync: async (sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...(params as never[])),
    // expo devolve null quando nao acha; node:sqlite devolve undefined.
    getFirstAsync: async (sql: string, params: unknown[] = []) =>
      raw.prepare(sql).get(...(params as never[])) ?? null,
  }),
}));

const db = await import("./database");

const AGORA = "2026-08-27T12:00:00.000Z";

function evento(over: Partial<SaleEvent> = {}): SaleEvent {
  return {
    id: "evt-1",
    timeMs: 0,
    title: "Venda simulada",
    storeName: "Loja Exemplo",
    productName: "Produto Exemplo",
    quantity: 1,
    amountCents: 8970,
    currency: "BRL",
    ...over,
  };
}

function projeto(over: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "Projeto de teste",
    format: "vertical-9x16",
    platformStyle: "ios-inspired",
    theme: "light",
    background: DEFAULT_BACKGROUND,
    disclosure: DEFAULT_DISCLOSURE,
    timelineMode: "single",
    events: [],
    createdAt: AGORA,
    updatedAt: AGORA,
    schemaVersion: 1,
    ...over,
  };
}

function produto(over: Partial<Product> = {}): Product {
  return {
    id: "prod-teste",
    name: "Fone de teste",
    priceCents: 12900,
    commissionBp: 1500,
    createdAt: AGORA,
    updatedAt: AGORA,
    ...over,
  };
}

beforeEach(async () => {
  // Banco novo a cada teste; database.ts cacheia a conexao, mas o adaptador
  // sempre le a variavel `raw` atual, entao o cache nao vaza estado.
  raw = new DatabaseSync(":memory:");
  await db.initDb();
});

describe("migrations", () => {
  it("cria o esquema e semeia o catalogo na primeira execucao", async () => {
    const produtos = await db.getAllProducts();
    expect(produtos).toHaveLength(SAMPLE_PRODUCTS.length);
    expect(produtos.every((p) => p.commissionBp >= 0)).toBe(true);
  });

  it("e idempotente: rodar de novo nao duplica produto nem migration", async () => {
    await db.initDb();
    await db.initDb();

    const produtos = await db.getAllProducts();
    expect(produtos).toHaveLength(SAMPLE_PRODUCTS.length);

    const versoes = raw
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all() as { version: number }[];
    expect(new Set(versoes.map((v) => v.version)).size).toBe(versoes.length);
  });

  it("ordena o catalogo em ordem alfabetica de pt-BR, com acento no lugar certo", async () => {
    const nomes = (await db.getAllProducts()).map((p) => p.name);
    const esperado = [...nomes].sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
    );
    expect(nomes).toEqual(esperado);

    // Regressao: com o COLLATE NOCASE do SQLite, "Serum" acentuado ia parar
    // depois de "Suporte" porque a comparacao era por byte.
    const serum = nomes.findIndex((n) => n.startsWith("Sérum"));
    const suporte = nomes.findIndex((n) => n.startsWith("Suporte"));
    expect(serum).toBeGreaterThanOrEqual(0);
    expect(suporte).toBeGreaterThanOrEqual(0);
    expect(serum).toBeLessThan(suporte);
  });
});

describe("projetos", () => {
  it("faz round-trip preservando campos e a ordem dos eventos", async () => {
    const p = projeto({
      events: [
        evento({ id: "evt-a", timeMs: 0, title: "Primeira" }),
        evento({ id: "evt-b", timeMs: 6000, title: "Segunda" }),
        evento({ id: "evt-c", timeMs: 12000, title: "Terceira" }),
      ],
    });
    await db.saveProject(p);

    const lido = await db.getProject("proj-1");
    expect(lido).not.toBeNull();
    expect(lido!.name).toBe(p.name);
    expect(lido!.background).toEqual(p.background);
    expect(lido!.disclosure).toEqual(p.disclosure);
    expect(lido!.events.map((e) => e.id)).toEqual(["evt-a", "evt-b", "evt-c"]);
  });

  it("preserva o snapshot de comissao e o vinculo com o produto", async () => {
    await db.saveProject(
      projeto({
        events: [evento({ productId: "prod-teste", commissionBp: 1500 })],
      }),
    );

    const lido = await db.getProject("proj-1");
    expect(lido!.events[0]!.productId).toBe("prod-teste");
    expect(lido!.events[0]!.commissionBp).toBe(1500);
  });

  it("distingue comissao zero de comissao ausente", async () => {
    await db.saveProject(
      projeto({
        events: [
          evento({ id: "evt-zero", commissionBp: 0 }),
          evento({ id: "evt-sem" }),
        ],
      }),
    );

    const lido = await db.getProject("proj-1");
    expect(lido!.events[0]!.commissionBp).toBe(0);
    expect(lido!.events[1]!.commissionBp).toBeUndefined();
  });

  it("substitui os eventos ao salvar de novo, em vez de acumular", async () => {
    await db.saveProject(
      projeto({ events: [evento({ id: "evt-a" }), evento({ id: "evt-b" })] }),
    );
    await db.saveProject(projeto({ events: [evento({ id: "evt-c" })] }));

    const lido = await db.getProject("proj-1");
    expect(lido!.events.map((e) => e.id)).toEqual(["evt-c"]);
  });

  it("lista os projetos do mais recente para o mais antigo", async () => {
    await db.saveProject(
      projeto({ id: "antigo", updatedAt: "2026-08-01T00:00:00.000Z" }),
    );
    await db.saveProject(
      projeto({ id: "recente", updatedAt: "2026-08-27T00:00:00.000Z" }),
    );

    const ids = (await db.getAllProjects()).map((p) => p.id);
    expect(ids).toEqual(["recente", "antigo"]);
  });

  it("devolve null para projeto inexistente", async () => {
    expect(await db.getProject("nao-existe")).toBeNull();
  });

  it("apagar o projeto leva junto os eventos dele", async () => {
    await db.saveProject(projeto({ events: [evento()] }));
    await db.deleteProject("proj-1");

    expect(await db.getProject("proj-1")).toBeNull();
    const sobraram = raw
      .prepare("SELECT COUNT(*) AS n FROM project_events WHERE project_id = ?")
      .get("proj-1") as { n: number };
    expect(sobraram.n).toBe(0);
  });

  it("duplicar gera ids novos para o projeto e para cada evento", async () => {
    await db.saveProject(
      projeto({ events: [evento({ id: "evt-a" }), evento({ id: "evt-b" })] }),
    );

    const copia = await db.duplicateProject("proj-1", "Copia");
    expect(copia).not.toBeNull();
    expect(copia!.id).not.toBe("proj-1");
    expect(copia!.name).toBe("Copia");
    expect(copia!.events.map((e) => e.id)).not.toEqual(["evt-a", "evt-b"]);
    expect(new Set(copia!.events.map((e) => e.id)).size).toBe(2);

    // O original continua intacto.
    const original = await db.getProject("proj-1");
    expect(original!.events.map((e) => e.id)).toEqual(["evt-a", "evt-b"]);
  });

  it("duplicar projeto inexistente devolve null", async () => {
    expect(await db.duplicateProject("nao-existe", "Copia")).toBeNull();
  });
});

describe("produtos", () => {
  it("faz round-trip de produto com e sem foto", async () => {
    await db.saveProduct(produto({ photoUri: "file:///foto.jpg" }));
    await db.saveProduct(produto({ id: "prod-sem-foto" }));

    expect((await db.getProduct("prod-teste"))!.photoUri).toBe(
      "file:///foto.jpg",
    );
    expect((await db.getProduct("prod-sem-foto"))!.photoUri).toBeUndefined();
  });

  it("devolve null para produto inexistente", async () => {
    expect(await db.getProduct("nao-existe")).toBeNull();
  });

  it("apagar produto desvincula os eventos sem apagar o snapshot", async () => {
    await db.saveProduct(produto());
    await db.saveProject(
      projeto({
        events: [
          evento({
            productId: "prod-teste",
            productName: "Fone de teste",
            commissionBp: 1500,
          }),
        ],
      }),
    );

    await db.deleteProduct("prod-teste");

    expect(await db.getProduct("prod-teste")).toBeNull();
    const lido = await db.getProject("proj-1");
    expect(lido!.events).toHaveLength(1);
    expect(lido!.events[0]!.productId).toBeUndefined();
    // O que a timeline ja mostrava continua de pe.
    expect(lido!.events[0]!.productName).toBe("Fone de teste");
    expect(lido!.events[0]!.commissionBp).toBe(1500);
  });
});
