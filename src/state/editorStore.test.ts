import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "./editorStore";
import type { Project, SaleEvent } from "../domain/types";

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

function makeProject(eventCount = 0): Project {
  const events = Array.from({ length: eventCount }, (_, i) =>
    makeEvent({ id: `evt-${i}`, timeMs: i * 5000 }),
  );
  return {
    id: "proj-test",
    name: "Projeto Teste",
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
    events,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

beforeEach(() => {
  useEditorStore.setState({
    project: null,
    selectedEventId: null,
    activeTab: "content",
    undoStack: [],
    redoStack: [],
  });
});

describe("editorStore", () => {
  describe("setProject", () => {
    it("inicializa project e limpa stacks", () => {
      const { setProject } = useEditorStore.getState();
      const proj = makeProject(2);
      setProject(proj);
      const s = useEditorStore.getState();
      expect(s.project).toBe(proj);
      expect(s.selectedEventId).toBeNull();
      expect(s.undoStack).toHaveLength(0);
      expect(s.redoStack).toHaveLength(0);
    });
  });

  describe("CRUD de eventos", () => {
    it("addEvent adiciona e seleciona", () => {
      const { setProject, addEvent } = useEditorStore.getState();
      setProject(makeProject(0));
      const evt = makeEvent({ id: "evt-new" });
      addEvent(evt);
      const s = useEditorStore.getState();
      expect(s.project!.events).toHaveLength(1);
      expect(s.project!.events[0].id).toBe("evt-new");
      expect(s.selectedEventId).toBe("evt-new");
    });

    it("updateEvent aplica patch", () => {
      const { setProject, updateEvent } = useEditorStore.getState();
      setProject(makeProject(1));
      const orig = useEditorStore.getState().project!.events[0];
      updateEvent(orig.id, { quantity: 3, amountCents: 19990 });
      const s = useEditorStore.getState();
      expect(s.project!.events[0].quantity).toBe(3);
      expect(s.project!.events[0].amountCents).toBe(19990);
    });

    it("removeEvent remove e deseleciona se era o selecionado", () => {
      const { setProject, addEvent, removeEvent, selectEvent } =
        useEditorStore.getState();
      setProject(makeProject(0));
      addEvent(makeEvent({ id: "a" }));
      addEvent(makeEvent({ id: "b" }));
      selectEvent("a");
      removeEvent("a");
      const s = useEditorStore.getState();
      expect(s.project!.events).toHaveLength(1);
      expect(s.project!.events[0].id).toBe("b");
      expect(s.selectedEventId).toBeNull();
    });

    it("removeEvent mantem selecionado se era outro", () => {
      const { setProject, addEvent, removeEvent, selectEvent } =
        useEditorStore.getState();
      setProject(makeProject(0));
      addEvent(makeEvent({ id: "a" }));
      addEvent(makeEvent({ id: "b" }));
      selectEvent("b");
      removeEvent("a");
      const s = useEditorStore.getState();
      expect(s.selectedEventId).toBe("b");
    });

    it("reorderEvents substitui lista e mantem selected", () => {
      const { setProject, addEvent, selectEvent, reorderEvents } =
        useEditorStore.getState();
      setProject(makeProject(0));
      addEvent(makeEvent({ id: "a" }));
      addEvent(makeEvent({ id: "b" }));
      selectEvent("b");
      reorderEvents([
        makeEvent({ id: "b", timeMs: 0 }),
        makeEvent({ id: "a", timeMs: 5000 }),
      ]);
      const s = useEditorStore.getState();
      expect(s.project!.events[0].id).toBe("b");
      expect(s.project!.events[1].id).toBe("a");
      expect(s.selectedEventId).toBe("b");
    });

    it("updateProject aplica patch no projeto", () => {
      const { setProject, updateProject } = useEditorStore.getState();
      setProject(makeProject());
      updateProject({ name: "Novo Nome" });
      expect(useEditorStore.getState().project!.name).toBe("Novo Nome");
    });
  });

  describe("undo / redo", () => {
    it("setProject limpa historico", () => {
      const { setProject, updateEvent } = useEditorStore.getState();
      setProject(makeProject(1));
      const id = useEditorStore.getState().project!.events[0].id;
      updateEvent(id, { quantity: 2 });
      expect(useEditorStore.getState().undoStack).toHaveLength(1);
      setProject(makeProject(2));
      expect(useEditorStore.getState().undoStack).toHaveLength(0);
      expect(useEditorStore.getState().redoStack).toHaveLength(0);
    });

    it("updateEvent empilha no undoStack e limpa redoStack", () => {
      const { setProject, updateEvent, undo } = useEditorStore.getState();
      setProject(makeProject(1));
      const id = useEditorStore.getState().project!.events[0].id;
      updateEvent(id, { quantity: 2 });
      const s1 = useEditorStore.getState();
      expect(s1.undoStack).toHaveLength(1);
      expect(s1.project!.events[0].quantity).toBe(2);
      undo();
      expect(useEditorStore.getState().project!.events[0].quantity).toBe(1);
    });

    it("redo restaura estado desfeito", () => {
      const { setProject, updateEvent, undo, redo } = useEditorStore.getState();
      setProject(makeProject(1));
      const id = useEditorStore.getState().project!.events[0].id;
      updateEvent(id, { quantity: 5 });
      undo();
      redo();
      const s = useEditorStore.getState();
      expect(s.project!.events[0].quantity).toBe(5);
      expect(s.undoStack).toHaveLength(1);
      expect(s.redoStack).toHaveLength(0);
    });

    it("nova operacao limpa redoStack", () => {
      const { setProject, updateEvent, undo } = useEditorStore.getState();
      setProject(makeProject(1));
      const id = useEditorStore.getState().project!.events[0].id;
      updateEvent(id, { quantity: 2 });
      undo();
      expect(useEditorStore.getState().redoStack).toHaveLength(1);
      updateEvent(id, { quantity: 3 });
      expect(useEditorStore.getState().redoStack).toHaveLength(0);
    });

    it("undo com stack vazia nao faz nada", () => {
      const { setProject, undo } = useEditorStore.getState();
      setProject(makeProject(1));
      undo();
      const s = useEditorStore.getState();
      expect(s.project).not.toBeNull();
      expect(s.undoStack).toHaveLength(0);
    });

    it("redo com stack vazia nao faz nada", () => {
      const { setProject, redo } = useEditorStore.getState();
      setProject(makeProject(1));
      redo();
      expect(useEditorStore.getState().redoStack).toHaveLength(0);
    });

    it("addEvent empilha no undo e desfaz corretamente", () => {
      const { setProject, addEvent, undo } = useEditorStore.getState();
      setProject(makeProject(0));
      addEvent(makeEvent({ id: "x" }));
      expect(useEditorStore.getState().project!.events).toHaveLength(1);
      undo();
      expect(useEditorStore.getState().project!.events).toHaveLength(0);
    });

    it("removeEvent empilha no undo e restaura evento", () => {
      const { setProject, addEvent, removeEvent, undo } =
        useEditorStore.getState();
      setProject(makeProject(0));
      addEvent(makeEvent({ id: "x" }));
      removeEvent("x");
      expect(useEditorStore.getState().project!.events).toHaveLength(0);
      undo();
      expect(useEditorStore.getState().project!.events).toHaveLength(1);
      expect(useEditorStore.getState().project!.events[0].id).toBe("x");
    });

  it("undo/redo preserva selectedEventId", () => {
    const { setProject, addEvent, selectEvent, updateEvent, undo, redo } =
      useEditorStore.getState();
      setProject(makeProject(0));
      addEvent(makeEvent({ id: "a" }));
      addEvent(makeEvent({ id: "b" }));
      selectEvent("b");
      updateEvent("b", { quantity: 10 });
      undo();
      expect(useEditorStore.getState().selectedEventId).toBe("b");
      redo();
      expect(useEditorStore.getState().selectedEventId).toBe("b");
    });

    it("limita undoStack a 50 entradas", () => {
      const { setProject, updateEvent } = useEditorStore.getState();
      setProject(makeProject(1));
      const id = useEditorStore.getState().project!.events[0].id;
      for (let i = 0; i < 60; i++) {
        updateEvent(id, { quantity: i + 1 });
      }
      const s = useEditorStore.getState();
      expect(s.undoStack.length).toBeLessThanOrEqual(50);
      expect(s.project!.events[0].quantity).toBe(60);
    });

    it("undo 50 vezes restaura estado inicial", () => {
      const { setProject, updateEvent, undo } = useEditorStore.getState();
      setProject(makeProject(1));
      const id = useEditorStore.getState().project!.events[0].id;
      for (let i = 0; i < 50; i++) {
        updateEvent(id, { quantity: i + 1 });
      }
      for (let i = 0; i < 50; i++) {
        undo();
      }
      expect(useEditorStore.getState().project!.events[0].quantity).toBe(1);
    });
  });

  describe("selectEvent e tabs", () => {
    it("selectEvent atualiza selectedEventId", () => {
      const { setProject, selectEvent } = useEditorStore.getState();
      setProject(makeProject(2));
      selectEvent("evt-0");
      expect(useEditorStore.getState().selectedEventId).toBe("evt-0");
      selectEvent(null);
      expect(useEditorStore.getState().selectedEventId).toBeNull();
    });

    it("setActiveTab altera aba", () => {
      const { setActiveTab } = useEditorStore.getState();
      setActiveTab("export");
      expect(useEditorStore.getState().activeTab).toBe("export");
    });
  });

  describe("ignora operacoes sem project", () => {
    it("updateEvent sem project nao quebra", () => {
      const { updateEvent } = useEditorStore.getState();
      updateEvent("any", { quantity: 1 });
      expect(useEditorStore.getState().project).toBeNull();
    });

    it("addEvent sem project nao quebra", () => {
      const { addEvent } = useEditorStore.getState();
      addEvent(makeEvent());
      expect(useEditorStore.getState().project).toBeNull();
    });

    it("removeEvent sem project nao quebra", () => {
      const { removeEvent } = useEditorStore.getState();
      removeEvent("any");
      expect(useEditorStore.getState().project).toBeNull();
    });

    it("undo/redo sem project nao quebra", () => {
      const { undo, redo } = useEditorStore.getState();
      undo();
      redo();
      expect(useEditorStore.getState().project).toBeNull();
    });
  });
});
