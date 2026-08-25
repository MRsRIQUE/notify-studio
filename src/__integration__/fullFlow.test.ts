import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks de nativo (hoisted) ────────────────────────────────────────────────

const mockDrawRect = vi.hoisted(() => vi.fn());
const mockDrawRRect = vi.hoisted(() => vi.fn());
const mockDrawCircle = vi.hoisted(() => vi.fn());
const mockDrawText = vi.hoisted(() => vi.fn());
const mockSave = vi.hoisted(() => vi.fn());
const mockRestore = vi.hoisted(() => vi.fn());
const mockTranslate = vi.hoisted(() => vi.fn());
const mockSaveLayer = vi.hoisted(() => vi.fn());
const mockSetAlphaf = vi.hoisted(() => vi.fn());
const mockSetColor = vi.hoisted(() => vi.fn());
const mockMeasureText = vi.hoisted(() => vi.fn().mockReturnValue({ width: 100 }));

const mockCanvas = vi.hoisted(() => ({
  drawRect: mockDrawRect,
  drawRRect: mockDrawRRect,
  drawCircle: mockDrawCircle,
  drawText: mockDrawText,
  save: mockSave,
  restore: mockRestore,
  translate: mockTranslate,
  saveLayer: mockSaveLayer,
}));

const mockImage = vi.hoisted(() => ({
  encodeToBytes: vi.fn().mockReturnValue(new Uint8Array(50000)),
  readPixels: vi.fn().mockReturnValue(new Uint8Array(540 * 960 * 4)),
  dispose: vi.fn(),
}));

const mockSurface = vi.hoisted(() => ({
  getCanvas: vi.fn().mockReturnValue(mockCanvas),
  makeImageSnapshot: vi.fn().mockReturnValue(mockImage),
  dispose: vi.fn(),
}));

const mockFont = vi.hoisted(() => ({
  measureText: mockMeasureText,
  getSize: vi.fn().mockReturnValue(14),
}));

vi.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Paint: vi.fn().mockReturnValue({
      setColor: mockSetColor,
      setAlphaf: mockSetAlphaf,
    }),
    Color: vi.fn().mockReturnValue([0, 0, 0, 1]),
    XYWHRect: vi.fn().mockReturnValue({ x: 0, y: 0, w: 100, h: 100 }),
    RRectXY: vi.fn().mockReturnValue({}),
    Surface: {
      MakeOffscreen: vi.fn().mockReturnValue(mockSurface),
    },
  },
  matchFont: vi.fn().mockReturnValue(mockFont),
  ColorType: { RGBA_8888: 0 },
  AlphaType: { Opaque: 0 },
}));

vi.mock("expo-file-system", () => {
  class MockFile {
    uri: string;
    write = vi.fn();
    exists = true;
    delete = vi.fn();
    constructor(..._args: unknown[]) {
      this.uri = "file:///mock/file.gif";
    }
  }
  class MockDirectory {
    create = vi.fn();
    exists = true;
    delete = vi.fn();
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: {
      cache: "/mock/cache",
    },
  };
});

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn(),
}));

vi.mock("../platform/exportAnimated", () => ({
  exportAnimated: vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            kind: "gif",
            uri: "file:///mock/out.gif",
            frameCount: 10,
            durationMs: 1000,
            mimeType: "image/gif",
          });
        }, 5);
      }),
  ),
}));

// ── Imports depois dos mocks ─────────────────────────────────────────────────

import { useEditorStore } from "../state/editorStore";
import { validateDisclosure, DISCLOSURE_TEXT } from "../domain/disclosure";
import { drawNotification } from "../rendering/drawNotification";
import { composeFrame } from "../rendering/frameComposer";
import { useExportQueue } from "../state/exportQueue";
import { generateEvents } from "../domain/generator";
import {
  DEFAULT_DISCLOSURE,
  type Project,
  type SaleEvent,
  type DisclosureConfig,
} from "../domain/types";
import { GIF_WIDTH, GIF_HEIGHT } from "../platform/exportGif";
import { EXPORT_WIDTH, EXPORT_HEIGHT } from "../platform/exportPng";
import { exportAnimated } from "../platform/exportAnimated";
import { palette } from "../rendering/palette";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<SaleEvent> = {}): SaleEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timeMs: 0,
    title: "Nova venda demonstrativa",
    storeName: "Loja Exemplo",
    productName: "Produto Exemplo",
    quantity: 1,
    amountCents: 8970,
    currency: "BRL",
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-integration",
    name: "Projeto Integracao",
    format: "vertical-9x16",
    platformStyle: "ios-inspired",
    theme: "light",
    background: { kind: "solid", color: "#FFFFFF" },
    disclosure: {
      text: "Demonstração — dados simulados",
      position: "bottom",
      style: "bar",
    },
    timelineMode: "regular",
    events: [makeEvent()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.setState({
    project: null,
    selectedEventId: null,
    activeTab: "content",
    undoStack: [],
    redoStack: [],
  });
  useExportQueue.setState({ jobs: [] });
  mockSurface.getCanvas.mockReturnValue(mockCanvas);
  mockSurface.makeImageSnapshot.mockReturnValue(mockImage);
  mockImage.encodeToBytes.mockReturnValue(new Uint8Array(50000));
  mockImage.readPixels.mockReturnValue(new Uint8Array(540 * 960 * 4));
});

// ── 1. editorStore full flow ─────────────────────────────────────────────────

describe("Integracao: editorStore full flow", () => {
  it("init → setEvents → addEvent → undo → redo", () => {
    const { setProject, addEvent, undo, redo } =
      useEditorStore.getState();

    // init
    const proj = makeProject({ events: [] });
    setProject(proj);
    expect(useEditorStore.getState().project!.events).toHaveLength(0);

    // setEvents via updateProject
    const events = [
      makeEvent({ id: "e1", timeMs: 0, quantity: 1 }),
      makeEvent({ id: "e2", timeMs: 5000, quantity: 2 }),
    ];
    useEditorStore.getState().updateProject({ events });
    expect(useEditorStore.getState().project!.events).toHaveLength(2);

    // addEvent
    const newEvt = makeEvent({ id: "e3", timeMs: 10000, quantity: 3 });
    addEvent(newEvt);
    const s1 = useEditorStore.getState();
    expect(s1.project!.events).toHaveLength(3);
    expect(s1.project!.events[2].id).toBe("e3");
    expect(s1.selectedEventId).toBe("e3");

    // undo (desfaz addEvent)
    undo();
    const s2 = useEditorStore.getState();
    expect(s2.project!.events).toHaveLength(2);
    expect(s2.selectedEventId).toBeNull();

    // redo (restaura addEvent)
    redo();
    const s3 = useEditorStore.getState();
    expect(s3.project!.events).toHaveLength(3);
    expect(s3.project!.events[2].id).toBe("e3");
  });

  it("updateEvent e undo/redo preserva selectedEventId", () => {
    const { setProject, addEvent, selectEvent, updateEvent, undo, redo } =
      useEditorStore.getState();
    setProject(makeProject({ events: [] }));
    addEvent(makeEvent({ id: "a" }));
    selectEvent("a");
    updateEvent("a", { quantity: 99 });
    expect(useEditorStore.getState().project!.events[0].quantity).toBe(99);
    undo();
    expect(useEditorStore.getState().project!.events[0].quantity).toBe(1);
    expect(useEditorStore.getState().selectedEventId).toBe("a");
    redo();
    expect(useEditorStore.getState().project!.events[0].quantity).toBe(99);
    expect(useEditorStore.getState().selectedEventId).toBe("a");
  });

  it("removeEvent + undo restaura evento", () => {
    const { setProject, addEvent, removeEvent, undo } =
      useEditorStore.getState();
    setProject(makeProject({ events: [] }));
    addEvent(makeEvent({ id: "x" }));
    addEvent(makeEvent({ id: "y" }));
    removeEvent("x");
    expect(useEditorStore.getState().project!.events).toHaveLength(1);
    expect(useEditorStore.getState().project!.events[0].id).toBe("y");
    undo();
    expect(useEditorStore.getState().project!.events).toHaveLength(2);
    expect(useEditorStore.getState().project!.events[0].id).toBe("x");
  });

  it("limita undoStack a 50 entradas", () => {
    const { setProject, updateEvent } = useEditorStore.getState();
    setProject(makeProject());
    const id = useEditorStore.getState().project!.events[0].id;
    for (let i = 0; i < 60; i++) {
      updateEvent(id, { quantity: i + 1 });
    }
    expect(useEditorStore.getState().undoStack.length).toBeLessThanOrEqual(50);
    expect(useEditorStore.getState().project!.events[0].quantity).toBe(60);
  });
});

// ── 2. disclosure validation ─────────────────────────────────────────────────

describe("Integracao: disclosure para todas as configs padrao", () => {
  const positions: ("top" | "bottom")[] = ["top", "bottom"];
  const styles: ("bar" | "badge")[] = ["bar", "badge"];

  for (const position of positions) {
    for (const style of styles) {
      it(`valida ${position}/${style} com bounds corretos`, () => {
        const disc: DisclosureConfig = {
          text: DISCLOSURE_TEXT,
          position,
          style,
        };
        const result = validateDisclosure(disc, {
          height: 1920,
          barY: position === "top" ? 0 : 1920 - 86,
          barHeight: 86,
        });
        expect(result.ok).toBe(true);
      });
    }
  }

  it("rejeita texto incorreto", () => {
    const disc = {
      text: "Texto errado",
      position: "bottom",
      style: "bar",
    } as unknown as DisclosureConfig;
    const result = validateDisclosure(disc);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("text-mismatch");
  });

  it("rejeita posicao invalida", () => {
    const disc = {
      text: DISCLOSURE_TEXT,
      position: "center",
      style: "bar",
    } as unknown as DisclosureConfig;
    const result = validateDisclosure(disc);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid-position");
  });

  it("rejeita style invalido", () => {
    const disc = {
      text: DISCLOSURE_TEXT,
      position: "bottom",
      style: "pill",
    } as unknown as DisclosureConfig;
    const result = validateDisclosure(disc);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid-style");
  });

  it("rejeita bar fora da area visivel", () => {
    const disc: DisclosureConfig = {
      text: DISCLOSURE_TEXT,
      position: "top",
      style: "bar",
    };
    const result = validateDisclosure(disc, {
      height: 200,
      barY: 0,
      barHeight: 300,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("outside-visible-area");
  });

  it("DEFAULT_DISCLOSURE passa validacao", () => {
    const result = validateDisclosure(DEFAULT_DISCLOSURE, {
      height: 1920,
      barY: 1920 - 86,
      barHeight: 86,
    });
    expect(result.ok).toBe(true);
  });
});

// ── 3. PNG/GIF via mocks nativo ──────────────────────────────────────────────

describe("Integracao: exportPng/exportGif com Skia mockado", () => {
  it("exportPng gera arquivo e retorna uri", async () => {
    const { exportPng } = await import("../platform/exportPng");
    const uri = await exportPng({
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      style: "ios-inspired",
      theme: "light",
      disclosure: {
        text: "Demonstração — dados simulados",
        position: "bottom",
        style: "bar",
      },
      event: makeEvent(),
    });
    expect(uri).toBeTruthy();
    expect(mockSurface.getCanvas).toHaveBeenCalled();
    expect(mockSurface.makeImageSnapshot).toHaveBeenCalled();
    expect(mockImage.encodeToBytes).toHaveBeenCalled();
  });

  it("exportPng usa dimensoes de exportacao (1080x1920)", async () => {
    const { exportPng } = await import("../platform/exportPng");
    const { Skia } = await import("@shopify/react-native-skia");
    await exportPng({
      width: 300,
      height: 600,
      style: "generic",
      theme: "dark",
      disclosure: {
        text: "Demonstração — dados simulados",
        position: "top",
        style: "badge",
      },
      event: makeEvent(),
    });
    expect(Skia.Surface.MakeOffscreen).toHaveBeenCalledWith(
      EXPORT_WIDTH,
      EXPORT_HEIGHT,
    );
  });

  it("exportPng bloqueia se disclosure invalida", async () => {
    const { exportPng } = await import("../platform/exportPng");
    await expect(
      exportPng({
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        style: "ios-inspired",
        theme: "light",
        disclosure: {
          text: "Texto errado",
          position: "bottom",
          style: "bar",
        } as unknown as DisclosureConfig,
        event: makeEvent(),
      }),
    ).rejects.toThrow("disclosure invalid");
  });

  it("exportGif gera arquivo e retorna uri + metadata", async () => {
    const { exportGif } = await import("../platform/exportGif");
    const result = await exportGif(
      makeProject({ events: [makeEvent({ timeMs: 0 })] }),
    );
    expect(result.uri).toBeTruthy();
    expect(result.frameCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("exportGif usa dimensoes de exportacao (540x960)", async () => {
    const { exportGif } = await import("../platform/exportGif");
    const { Skia } = await import("@shopify/react-native-skia");
    await exportGif(
      makeProject({
        events: [makeEvent({ timeMs: 0 })],
        platformStyle: "android-inspired",
      }),
    );
    expect(Skia.Surface.MakeOffscreen).toHaveBeenCalledWith(
      GIF_WIDTH,
      GIF_HEIGHT,
    );
  });

  it("exportGif bloqueia disclosure invalida", async () => {
    const { exportGif } = await import("../platform/exportGif");
    await expect(
      exportGif(
        makeProject({
          disclosure: {
            text: "Errado",
            position: "bottom",
            style: "bar",
          } as unknown as DisclosureConfig,
        }),
      ),
    ).rejects.toThrow("disclosure invalid");
  });

  it("exportGif rejeita projeto sem eventos", async () => {
    const { exportGif } = await import("../platform/exportGif");
    await expect(exportGif(makeProject({ events: [] }))).rejects.toThrow(
      "sem eventos",
    );
  });

  it("exportGif reporta progresso", async () => {
    const { exportGif } = await import("../platform/exportGif");
    const onProgress = vi.fn();
    await exportGif(
      makeProject({ events: [makeEvent({ timeMs: 0 })] }),
      { onProgress },
    );
    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(lastCall[0]).toBe(1);
  });
});

// ── 4. renderizacao deterministica via hash ───────────────────────────────────

describe("Integracao: renderizacao determinista de drawNotification", () => {
  function captureDrawCalls(): string {
    const calls: string[] = [];
    mockDrawRect.mockImplementation((rect: unknown) => {
      calls.push(`rect:${JSON.stringify(rect)}`);
    });
    mockDrawRRect.mockImplementation((rrect: unknown) => {
      calls.push(`rrect:${JSON.stringify(rrect)}`);
    });
    mockDrawCircle.mockImplementation((cx: number, cy: number, r: number) => {
      calls.push(`circle:${cx.toFixed(2)},${cy.toFixed(2)},${r.toFixed(2)}`);
    });
    mockDrawText.mockImplementation(
      (text: string, x: number, y: number) => {
        calls.push(`text:${text}:${x.toFixed(2)},${y.toFixed(2)}`);
      },
    );
    return calls.join("|");
  }

  it("mesmo spec produz mesmo hash de draw calls", () => {
    const spec = {
      width: 1080,
      height: 1920,
      style: "ios-inspired" as const,
      theme: "light" as const,
      disclosure: {
        text: "Demonstração — dados simulados" as const,
        position: "bottom" as const,
        style: "bar" as const,
      },
      event: makeEvent({ timeMs: 0 }),
    };

    captureDrawCalls();
    drawNotification(mockCanvas as never, spec);
    const calls1 = [...mockDrawText.mock.calls];

    vi.clearAllMocks();

    captureDrawCalls();
    drawNotification(mockCanvas as never, spec);
    const calls2 = [...mockDrawText.mock.calls];

    expect(calls1.length).toBe(calls2.length);
    for (let i = 0; i < calls1.length; i++) {
      expect(calls1[i][0]).toBe(calls2[i][0]);
      expect(calls1[i][1]).toBe(calls2[i][1]);
    }
  });

  it("specs diferentes produzem draw calls diferentes", () => {
    const spec1 = {
      width: 1080,
      height: 1920,
      style: "ios-inspired" as const,
      theme: "light" as const,
      disclosure: {
        text: "Demonstração — dados simulados" as const,
        position: "bottom" as const,
        style: "bar" as const,
      },
      event: makeEvent({ timeMs: 0 }),
    };
    const spec2 = {
      width: 1080,
      height: 1920,
      style: "android-inspired" as const,
      theme: "dark" as const,
      disclosure: {
        text: "Demonstração — dados simulados" as const,
        position: "top" as const,
        style: "badge" as const,
      },
      event: makeEvent({ timeMs: 5000, quantity: 5 }),
    };

    captureDrawCalls();
    drawNotification(mockCanvas as never, spec1);
    const calls1 = mockDrawText.mock.calls.map(
      (c: unknown[]) => `${c[0]}:${c[1]}`,
    );

    vi.clearAllMocks();

    captureDrawCalls();
    drawNotification(mockCanvas as never, spec2);
    const calls2 = mockDrawText.mock.calls.map(
      (c: unknown[]) => `${c[0]}:${c[1]}`,
    );

    expect(calls1).not.toEqual(calls2);
  });

  it("composeFrame e determinista para mesmo project e timeMs", () => {
    const project = makeProject({
      events: [
        makeEvent({ id: "a", timeMs: 0 }),
        makeEvent({ id: "b", timeMs: 5000 }),
      ],
    });

    captureDrawCalls();
    composeFrame(
      mockCanvas as never,
      { width: 540, height: 960, project },
      2000,
    );
    const calls1 = [...mockDrawText.mock.calls];

    vi.clearAllMocks();

    captureDrawCalls();
    composeFrame(
      mockCanvas as never,
      { width: 540, height: 960, project },
      2000,
    );
    const calls2 = [...mockDrawText.mock.calls];

    expect(calls1.length).toBe(calls2.length);
    for (let i = 0; i < calls1.length; i++) {
      expect(calls1[i][0]).toBe(calls2[i][0]);
      expect(calls1[i][1]).toBe(calls2[i][1]);
    }
  });

  it("dois themes produzem paletas diferentes", () => {
    const light = palette("ios-inspired", "light");
    const dark = palette("ios-inspired", "dark");
    expect(light.bg).not.toBe(dark.bg);
    expect(light.card).not.toBe(dark.card);
    expect(light.title).not.toBe(dark.title);
  });
});

// ── 5. exportQueue serial ────────────────────────────────────────────────────

describe("Integracao: exportQueue dispara em ordem serial", () => {
  it("jobs sao processados sequencialmente", async () => {
    let activeCount = 0;
    let maxConcurrent = 0;

    (exportAnimated as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) => {
          activeCount++;
          maxConcurrent = Math.max(maxConcurrent, activeCount);
          setTimeout(() => {
            activeCount--;
            resolve({
              kind: "gif",
              uri: "file:///mock/out.gif",
              frameCount: 10,
              durationMs: 1000,
              mimeType: "image/gif",
            });
          }, 5);
        }),
    );

    const { enqueue } = useExportQueue.getState();
    enqueue(makeProject());
    enqueue(makeProject());
    enqueue(makeProject());

    await vi.waitFor(
      () => {
        expect(
          useExportQueue.getState().jobs.every((j) => j.status === "done"),
        ).toBe(true);
      },
      { timeout: 5000 },
    );

    expect(maxConcurrent).toBe(1);
    expect(exportAnimated).toHaveBeenCalledTimes(3);
  });
});

// ── 6. generator integracao ──────────────────────────────────────────────────

describe("Integracao: generator + editorStore", () => {
  it("gera eventos e injeta no store", () => {
    const events = generateEvents(
      {
        quantityMin: 1,
        quantityMax: 1,
        amountMinCents: 5000,
        amountMaxCents: 5000,
        intervalMinMs: 3000,
        intervalMaxMs: 5000,
        durationMs: 15000,
        curve: "growth",
      },
      42,
    );
    expect(events.length).toBeGreaterThanOrEqual(1);

    const { setProject, updateProject } = useEditorStore.getState();
    setProject(makeProject({ events: [] }));
    updateProject({ events });
    expect(useEditorStore.getState().project!.events.length).toBe(events.length);
    expect(useEditorStore.getState().project!.events[0].timeMs).toBe(
      events[0].timeMs,
    );
  });

  it("eventos gerados sao validos para disclosure", () => {
    const events = generateEvents(
      {
        quantityMin: 1,
        quantityMax: 2,
        amountMinCents: 1000,
        amountMaxCents: 50000,
        intervalMinMs: 1000,
        intervalMaxMs: 3000,
        durationMs: 10000,
        curve: "constant",
      },
      99,
    );
    for (const event of events) {
      expect(event.id).toBeTruthy();
      expect(event.title).toBeTruthy();
      expect(event.storeName).toBeTruthy();
      expect(event.productName).toBeTruthy();
      expect(event.quantity).toBeGreaterThanOrEqual(1);
      expect(event.amountCents).toBeGreaterThanOrEqual(1);
      expect(["BRL", "USD", "EUR"]).toContain(event.currency);
    }
  });
});
