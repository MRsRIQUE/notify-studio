import { create } from "zustand";
import type { Project } from "../domain/types";
import {
  exportAnimated,
  type AnimatedExportResult,
} from "../platform/exportAnimated";
import { ExportCancelledError } from "../platform/exportVideo";

export type ExportJobStatus =
  | "queued"
  | "render"
  | "encode"
  | "done"
  | "error"
  | "cancelled";

export type ExportJob = {
  id: string;
  project: Project;
  status: ExportJobStatus;
  progress: number;
  result?: AnimatedExportResult;
  error?: string;
  controller: AbortController;
};

type ExportQueueState = {
  jobs: ExportJob[];
  enqueue: (project: Project) => void;
  cancel: (id: string) => void;
  clear: () => void;
};

let seq = 0;

export const useExportQueue = create<ExportQueueState>((set, get) => {
  let running = false;

  async function process(id: string): Promise<void> {
    const job = get().jobs.find((j) => j.id === id);
    if (!job) return;
    const patchJob = (patch: Partial<ExportJob>) =>
      set((s) => ({
        jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
      }));

    patchJob({ status: "render", progress: 0 });
    try {
      const result = await exportAnimated(job.project, {
        signal: job.controller.signal,
        onProgress: (p) =>
          patchJob({ status: p.phase, progress: p.progress }),
      });
      patchJob({ status: "done", progress: 1, result });
    } catch (err) {
      if (job.controller.signal.aborted || err instanceof ExportCancelledError) {
        patchJob({ status: "cancelled", progress: 0 });
      } else {
        patchJob({
          status: "error",
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }
  }

  async function run(): Promise<void> {
    if (running) return;
    running = true;
    try {
      for (;;) {
        const next = get().jobs.find((j) => j.status === "queued");
        if (!next) break;
        await process(next.id);
      }
    } finally {
      running = false;
    }
  }

  return {
    jobs: [],
    enqueue: (project) => {
      const controller = new AbortController();
      const job: ExportJob = {
        id: `job-${++seq}-${Date.now()}`,
        project,
        status: "queued",
        progress: 0,
        controller,
      };
      set((s) => ({ jobs: [...s.jobs, job] }));
      void run();
    },
    cancel: (id) => {
      const job = get().jobs.find((j) => j.id === id);
      job?.controller.abort();
    },
    clear: () => {
      for (const job of get().jobs) {
        job.controller.abort();
      }
      set({ jobs: [] });
    },
  };
});
