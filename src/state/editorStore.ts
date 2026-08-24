import { create } from "zustand";
import type {
  Project,
  SaleEvent,
} from "../domain/types";

export type EditorTab = "content" | "appearance" | "timeline" | "export";

type HistoryEntry = {
  project: Project;
  selectedEventId: string | null;
};

type EditorState = {
  project: Project | null;
  selectedEventId: string | null;
  activeTab: EditorTab;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  setProject: (project: Project) => void;
  selectEvent: (id: string | null) => void;
  setActiveTab: (tab: EditorTab) => void;
  updateEvent: (id: string, patch: Partial<SaleEvent>) => void;
  addEvent: (event: SaleEvent) => void;
  removeEvent: (id: string) => void;
  reorderEvents: (events: readonly SaleEvent[]) => void;
  updateProject: (patch: Partial<Project>) => void;
  undo: () => void;
  redo: () => void;
};

function pushHistory(state: EditorState): HistoryEntry[] {
  if (!state.project) return state.undoStack;
  return [
    ...state.undoStack.slice(-49),
    { project: state.project, selectedEventId: state.selectedEventId },
  ];
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedEventId: null,
  activeTab: "content",
  undoStack: [],
  redoStack: [],

  setProject: (project) =>
    set({ project, selectedEventId: null, undoStack: [], redoStack: [] }),

  selectEvent: (id) => set({ selectedEventId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateEvent: (id, patch) =>
    set((state) => {
      if (!state.project) return state;
      const history = pushHistory(state);
      const events = state.project.events.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      );
      return {
        project: {
          ...state.project,
          events,
          updatedAt: new Date().toISOString(),
        },
        undoStack: history,
        redoStack: [],
      };
    }),

  addEvent: (event) =>
    set((state) => {
      if (!state.project) return state;
      const history = pushHistory(state);
      return {
        project: {
          ...state.project,
          events: [...state.project.events, event],
          updatedAt: new Date().toISOString(),
        },
        selectedEventId: event.id,
        undoStack: history,
        redoStack: [],
      };
    }),

  removeEvent: (id) =>
    set((state) => {
      if (!state.project) return state;
      const history = pushHistory(state);
      const events = state.project.events.filter((e) => e.id !== id);
      return {
        project: {
          ...state.project,
          events,
          updatedAt: new Date().toISOString(),
        },
        selectedEventId:
          state.selectedEventId === id ? null : state.selectedEventId,
        undoStack: history,
        redoStack: [],
      };
    }),

  reorderEvents: (events) =>
    set((state) => {
      if (!state.project) return state;
      const history = pushHistory(state);
      return {
        project: {
          ...state.project,
          events,
          updatedAt: new Date().toISOString(),
        },
        undoStack: history,
        redoStack: [],
      };
    }),

  updateProject: (patch) =>
    set((state) => {
      if (!state.project) return state;
      const history = pushHistory(state);
      return {
        project: {
          ...state.project,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
        undoStack: history,
        redoStack: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1]!;
      const project = state.project;
      return {
        project: prev.project,
        selectedEventId: prev.selectedEventId,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: project
          ? [...state.redoStack, { project, selectedEventId: state.selectedEventId }]
          : state.redoStack,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1]!;
      const project = state.project;
      return {
        project: next.project,
        selectedEventId: next.selectedEventId,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: project
          ? [...state.undoStack, { project, selectedEventId: state.selectedEventId }]
          : state.undoStack,
      };
    }),
}));
