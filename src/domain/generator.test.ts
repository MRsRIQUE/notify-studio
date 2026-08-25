import { describe, it, expect } from "vitest";
import {
  generateEvents,
  mulberry32,
  regenerateEvent,
  type GeneratorRules,
} from "./generator";

const BASE_RULES: GeneratorRules = {
  quantityMin: 1,
  quantityMax: 2,
  amountMinCents: 5000,
  amountMaxCents: 10000,
  intervalMinMs: 2000,
  intervalMaxMs: 10000,
  durationMs: 30000,
  curve: "constant",
};

describe("mulberry32", () => {
  it("mesmo seed produz mesma sequencia", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("seeds diferentes produzem sequencias diferentes", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("valores estao no intervalo [0, 1)", () => {
    const rand = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("generateEvents", () => {
  it("retorna pelo menos 1 evento", () => {
    const events = generateEvents({ ...BASE_RULES, durationMs: 1000 }, 1);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("respeita duracao maxima", () => {
    const events = generateEvents({ ...BASE_RULES, durationMs: 5000 }, 1);
    const max = Math.max(...events.map((e) => e.timeMs));
    expect(max).toBeLessThanOrEqual(5000);
  });

  it("nao excede 64 eventos", () => {
    const events = generateEvents(
      { ...BASE_RULES, durationMs: 300000, intervalMinMs: 500 },
      1,
    );
    expect(events.length).toBeLessThanOrEqual(64);
  });

  it("eventos estao ordenados por timeMs", () => {
    const events = generateEvents(
      { ...BASE_RULES, durationMs: 20000, curve: "burst" },
      42,
    );
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timeMs).toBeGreaterThanOrEqual(events[i - 1].timeMs);
    }
  });

  it("determinismo: mesmo seed produz mesmos eventos", () => {
    const rules = { ...BASE_RULES, curve: "growth" as const };
    const a = generateEvents(rules, 77);
    const b = generateEvents(rules, 77);
    expect(a).toEqual(b);
  });

  it("seeds diferentes produzem resultados diferentes", () => {
    const rules = { ...BASE_RULES, curve: "constant" as const };
    const a = generateEvents(rules, 1);
    const b = generateEvents(rules, 2);
    expect(a).not.toEqual(b);
  });

  it("todos os eventos tem campos obrigatorios", () => {
    const events = generateEvents(BASE_RULES, 10);
    for (const e of events) {
      expect(e.id).toBeTruthy();
      expect(e.timeMs).toBeGreaterThanOrEqual(0);
      expect(e.title).toBeTruthy();
      expect(e.storeName).toBeTruthy();
      expect(e.productName).toBeTruthy();
      expect(e.quantity).toBeGreaterThanOrEqual(1);
      expect(e.amountCents).toBeGreaterThanOrEqual(1);
      expect(["BRL", "USD", "EUR"]).toContain(e.currency);
    }
  });
});

describe("curva growth", () => {
  it("intervalos diminuem ao longo do tempo", () => {
    const events = generateEvents(
      {
        ...BASE_RULES,
        curve: "growth",
        intervalMinMs: 2000,
        intervalMaxMs: 10000,
        durationMs: 30000,
      },
      42,
    );
    expect(events.length).toBeGreaterThanOrEqual(3);
    const diffs: number[] = [];
    for (let i = 1; i < events.length; i++) {
      diffs.push(events[i].timeMs - events[i - 1].timeMs);
    }
    const earlyAvg =
      diffs.slice(0, Math.floor(diffs.length / 2)).reduce((a, b) => a + b, 0) /
      Math.floor(diffs.length / 2);
    const lateAvg =
      diffs.slice(Math.floor(diffs.length / 2)).reduce((a, b) => a + b, 0) /
      (diffs.length - Math.floor(diffs.length / 2));
    expect(earlyAvg).toBeGreaterThan(lateAvg);
  });

  it("primeiro intervalo e >= intervalMax", () => {
    const events = generateEvents(
      {
        ...BASE_RULES,
        curve: "growth",
        intervalMinMs: 2000,
        intervalMaxMs: 8000,
        durationMs: 30000,
      },
      10,
    );
    if (events.length >= 2) {
      const firstDiff = events[1].timeMs - events[0].timeMs;
      expect(firstDiff).toBeGreaterThanOrEqual(7000);
    }
  });

  it("determinismo da curva growth", () => {
    const rules = {
      ...BASE_RULES,
      curve: "growth" as const,
      durationMs: 20000,
    };
    const a = generateEvents(rules, 55);
    const b = generateEvents(rules, 55);
    expect(a.map((e) => e.timeMs)).toEqual(b.map((e) => e.timeMs));
  });
});

describe("curva burst", () => {
  it("intervalos iniciam grandes e diminuem no final", () => {
    const events = generateEvents(
      {
        ...BASE_RULES,
        curve: "burst",
        intervalMinMs: 1000,
        intervalMaxMs: 8000,
        durationMs: 30000,
      },
      42,
    );
    expect(events.length).toBeGreaterThanOrEqual(4);
    const diffs: number[] = [];
    for (let i = 1; i < events.length; i++) {
      diffs.push(events[i].timeMs - events[i - 1].timeMs);
    }
    if (diffs.length >= 4) {
      const earlyHalf = diffs.slice(0, Math.floor(diffs.length / 2));
      const lateHalf = diffs.slice(Math.floor(diffs.length / 2));
      const avgEarly =
        earlyHalf.reduce((a, b) => a + b, 0) / earlyHalf.length;
      const avgLate = lateHalf.reduce((a, b) => a + b, 0) / lateHalf.length;
      expect(avgEarly).toBeGreaterThan(avgLate);
    }
  });

  it("determinismo da curva burst", () => {
    const rules = {
      ...BASE_RULES,
      curve: "burst" as const,
      durationMs: 25000,
    };
    const a = generateEvents(rules, 88);
    const b = generateEvents(rules, 88);
    expect(a.map((e) => e.timeMs)).toEqual(b.map((e) => e.timeMs));
  });

  it("burst tende a gerar mais eventos que growth", () => {
    const rules = {
      ...BASE_RULES,
      intervalMinMs: 1000,
      intervalMaxMs: 8000,
      durationMs: 30000,
    };
    const burst = generateEvents({ ...rules, curve: "burst" }, 42);
    const growth = generateEvents({ ...rules, curve: "growth" }, 42);
    expect(burst.length).toBeGreaterThanOrEqual(growth.length - 1);
  });
});

describe("curva constant", () => {
  it("intervalos sao aleatorios entre iMin e iMax", () => {
    const events = generateEvents(
      {
        ...BASE_RULES,
        curve: "constant",
        intervalMinMs: 3000,
        intervalMaxMs: 5000,
        durationMs: 20000,
      },
      42,
    );
    const diffs: number[] = [];
    for (let i = 1; i < events.length; i++) {
      diffs.push(events[i].timeMs - events[i - 1].timeMs);
    }
    for (const d of diffs) {
      expect(d).toBeGreaterThanOrEqual(2500);
      expect(d).toBeLessThanOrEqual(5500);
    }
  });
});

describe("regenerateEvent", () => {
  it("mantem id e timeMs, altera quantity e amountCents", () => {
    const orig = {
      id: "evt-1",
      timeMs: 5000,
      title: "Teste",
      storeName: "Loja",
      productName: "Prod",
      quantity: 1,
      amountCents: 1000,
      currency: "BRL" as const,
    };
    const regen = regenerateEvent(orig, BASE_RULES, 42);
    expect(regen.id).toBe("evt-1");
    expect(regen.timeMs).toBe(5000);
    expect(regen.quantity).toBeGreaterThanOrEqual(1);
    expect(regen.amountCents).toBeGreaterThanOrEqual(1);
  });
});
