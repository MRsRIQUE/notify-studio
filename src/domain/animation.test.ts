import { describe, expect, it } from "vitest";
import {
  ENTRY_MS,
  EXIT_MS,
  HOLD_MS,
  FPS,
  cardAnimAtTime,
} from "./animation";
import {
  frameCount,
  frameTimeMs,
  videoDurationMs,
  activeEventAnims,
  eventWindowEnd,
} from "./timeline";
import type { SaleEvent } from "./types";

function evt(id: string, timeMs: number): SaleEvent {
  return {
    id,
    timeMs,
    title: "Nova venda demonstrativa",
    storeName: "Loja Exemplo",
    productName: "Produto Exemplo",
    quantity: 1,
    amountCents: 8970,
    currency: "BRL",
  };
}

describe("cardAnimAtTime", () => {
  it("antes do inicio e depois do fim retorna opacity 0", () => {
    expect(cardAnimAtTime(-1, 0, 1000).opacity).toBe(0);
    expect(cardAnimAtTime(1000, 0, 1000).opacity).toBe(0);
  });

  it("na metade da entrada opacity entre 0 e 1 e translateY negativo", () => {
    const mid = cardAnimAtTime(ENTRY_MS / 2, 0, 2000);
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(mid.translateY).toBeLessThan(0);
  });

  it("no fim da entrada opacity 1 e translateY 0", () => {
    const at = cardAnimAtTime(ENTRY_MS, 0, 2000);
    expect(at.opacity).toBe(1);
    expect(at.translateY).toBe(0);
  });

  it("durante a saida opacity cai e translateY positivo", () => {
    const at = cardAnimAtTime(2000 - EXIT_MS / 2, 0, 2000);
    expect(at.opacity).toBeLessThan(1);
    expect(at.translateY).toBeGreaterThan(0);
  });
});

describe("timeline math", () => {
  const events = [evt("a", 0), evt("b", 5000), evt("c", 9000)];

  it("janela de um evento termina apos a entrada do proximo (crossfade)", () => {
    expect(eventWindowEnd(events, 0)).toBe(5000 + ENTRY_MS);
    expect(eventWindowEnd(events, 2)).toBe(9000 + ENTRY_MS + HOLD_MS);
  });

  it("duracao do video considera o ultimo evento + entrada + hold", () => {
    expect(videoDurationMs(events)).toBe(9000 + ENTRY_MS + HOLD_MS);
    expect(videoDurationMs([])).toBe(0);
  });

  it("frameCount e frameTimeMs sao coerentes", () => {
    const duration = videoDurationMs(events);
    const count = frameCount(events, FPS);
    expect(count).toBe(Math.ceil((duration / 1000) * FPS));
    expect(frameTimeMs(0, FPS)).toBe(0);
    expect(frameTimeMs(count - 1, FPS)).toBeLessThan(duration);
  });
});

describe("activeEventAnims", () => {
  const events = [evt("a", 0), evt("b", 5000), evt("c", 9000)];

  it("nenhum evento ativo antes do primeiro", () => {
    expect(activeEventAnims(events, -100)).toEqual([]);
  });

  it("um unico evento ativo em estado estavel", () => {
    const anims = activeEventAnims(events, 2000);
    expect(anims.map((a) => a.event.id)).toEqual(["a"]);
    expect(anims[0]!.anim.opacity).toBe(1);
  });

  it("crossfade: dois eventos ativos durante a sobreposicao", () => {
    const anims = activeEventAnims(events, 5200);
    const ids = anims.map((a) => a.event.id).sort();
    expect(ids).toEqual(["a", "b"]);
  });
});
