import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Project } from "../domain/types";

const mockExportAnimated = vi.hoisted(() => vi.fn());
vi.mock("../platform/exportAnimated", () => ({
  exportAnimated: (...args: unknown[]) => mockExportAnimated(...args),
}));

const { useExportQueue } = await import("./exportQueue");

function makeProject(): Project {
  return {
    id: "proj-test",
    name: "Teste",
    format: "vertical-9x16",
    platformStyle: "generic",
    theme: "light",
    background: { kind: "solid", color: "#FFF" },
    disclosure: {
      text: "Demonstração — dados simulados",
      position: "bottom",
      style: "bar",
    },
    timelineMode: "regular",
    events: [
      {
        id: "evt-1",
        timeMs: 0,
        title: "Venda demo",
        storeName: "Loja",
        productName: "Produto",
        quantity: 1,
        amountCents: 5000,
        currency: "BRL",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useExportQueue.setState({ jobs: [] });
  mockExportAnimated.mockReset();
});

describe("exportQueue", () => {
  it("serializacao: processa jobs em sequencia", async () => {
    let activeCount = 0;
    let maxConcurrent = 0;
    mockExportAnimated.mockImplementation(
      () =>
        new Promise((resolve) => {
          activeCount++;
          maxConcurrent = Math.max(maxConcurrent, activeCount);
          setTimeout(() => {
            activeCount--;
            resolve({
              kind: "gif",
              uri: "file:///test.gif",
              frameCount: 1,
              durationMs: 100,
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
    expect(mockExportAnimated).toHaveBeenCalledTimes(3);
    expect(maxConcurrent).toBe(1);
  });

  it("adiciona job e processa ate done", async () => {
    mockExportAnimated.mockResolvedValue({
      kind: "gif",
      uri: "file:///test.gif",
      frameCount: 10,
      durationMs: 1000,
      mimeType: "image/gif",
    });
    const { enqueue } = useExportQueue.getState();
    enqueue(makeProject());
    await vi.waitFor(() => {
      expect(useExportQueue.getState().jobs[0]?.status).toBe("done");
    });
    expect(useExportQueue.getState().jobs[0].result).toBeDefined();
  });

  it("reporta progresso durante render", async () => {
    let resolveExport!: (v: unknown) => void;
    mockExportAnimated.mockImplementation(
      (_project: unknown, opts: { onProgress?: (p: unknown) => void }) =>
        new Promise((resolve) => {
          opts.onProgress?.({ phase: "render", progress: 0.5 });
          resolveExport = resolve;
        }),
    );
    const { enqueue } = useExportQueue.getState();
    enqueue(makeProject());
    await vi.waitFor(() => {
      const job = useExportQueue.getState().jobs[0];
      expect(job?.status).toBe("render");
      expect(job?.progress).toBe(0.5);
    });
    resolveExport({
      kind: "gif",
      uri: "file:///test.gif",
      frameCount: 5,
      durationMs: 500,
      mimeType: "image/gif",
    });
    await vi.waitFor(() => {
      expect(useExportQueue.getState().jobs[0].status).toBe("done");
    });
  });

  it("cancela job em progresso", async () => {
    let rejectFn!: (err: Error) => void;
    mockExportAnimated.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectFn = reject;
        }),
    );
    const { enqueue, cancel } = useExportQueue.getState();
    enqueue(makeProject());
    await vi.waitFor(() => {
      expect(useExportQueue.getState().jobs[0]?.status).toBe("render");
    });
    const jobId = useExportQueue.getState().jobs[0].id;
    cancel(jobId);
    rejectFn(new DOMException("Aborted", "AbortError"));
    await vi.waitFor(() => {
      expect(useExportQueue.getState().jobs[0].status).toBe("cancelled");
    });
  });

  it("marca job como error quando exportAnimated falha", async () => {
    mockExportAnimated.mockRejectedValue(
      new Error("Falha na renderizacao"),
    );
    const { enqueue } = useExportQueue.getState();
    enqueue(makeProject());
    await vi.waitFor(() => {
      const job = useExportQueue.getState().jobs[0];
      expect(job.status).toBe("error");
      expect(job.error).toBe("Falha na renderizacao");
    });
  });

  it("erro desconhecido mostra mensagem generica", async () => {
    mockExportAnimated.mockRejectedValue("string error");
    const { enqueue } = useExportQueue.getState();
    enqueue(makeProject());
    await vi.waitFor(() => {
      const job = useExportQueue.getState().jobs[0];
      expect(job.status).toBe("error");
      expect(job.error).toBe("Erro desconhecido");
    });
  });

  it("aborta todos os jobs e limpa lista", async () => {
    let resolvers: ((v: unknown) => void)[] = [];
    mockExportAnimated.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const { enqueue, clear } = useExportQueue.getState();
    enqueue(makeProject());
    enqueue(makeProject());
    await vi.waitFor(() => {
      expect(
        useExportQueue.getState().jobs.some((j) => j.status === "render"),
      ).toBe(true);
    });
    clear();
    expect(useExportQueue.getState().jobs).toHaveLength(0);
    for (const r of resolvers) {
      r({ kind: "gif", uri: "file:///test.gif", frameCount: 1, durationMs: 100, mimeType: "image/gif" });
    }
    await new Promise((r) => setTimeout(r, 10));
  });
});
