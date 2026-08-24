import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { useEditorStore, type EditorTab } from "../state/editorStore";
import type {
  Project,
  SaleEvent,
  PlatformStyle,
  TimelineMode,
} from "../domain/types";
import { generateEvents, DEFAULT_RULES } from "../domain/generator";
import type { GeneratorRules } from "../domain/generator";
import { formatCurrency } from "../domain/currency";
import { NotificationRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from "../rendering/NotificationRenderer";
import { saveProject } from "../persistence/database";
import { exportPng, sharePng } from "../platform/exportPng";
import { playDemoSound, SOUND_PRESETS } from "../platform/sound";
import { useExportQueue } from "../state/exportQueue";
import { videoExportSupported } from "../platform/exportVideo";

type Props = {
  project: Project;
  onBack: () => void;
};

const TABS: { key: EditorTab; label: string }[] = [
  { key: "content", label: "Conteudo" },
  { key: "appearance", label: "Aparencia" },
  { key: "timeline", label: "Timeline" },
  { key: "export", label: "Exportar" },
];

const STYLES: PlatformStyle[] = ["ios-inspired", "android-inspired", "generic"];
const TIMELINE_MODES: TimelineMode[] = [
  "single",
  "regular",
  "burst",
  "growth",
  "manual",
];

const TIMELINE_MODE_LABELS: Record<TimelineMode, string> = {
  single: "Unico",
  regular: "Regular",
  burst: "Rajada",
  growth: "Crescimento",
  manual: "Manual",
};

export function EditorScreen({ project: initialProject, onBack }: Props) {
  const store = useEditorStore();
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const playTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const initialProjectRef = useRef(initialProject);
  const setProjectRef = useRef(store.setProject);

  useEffect(() => {
    initialProjectRef.current = initialProject;
  }, [initialProject]);

  useEffect(() => {
    setProjectRef.current = store.setProject;
  }, [store.setProject]);

  useEffect(() => {
    setProjectRef.current(initialProjectRef.current);
    return () => {
      playTimers.current.forEach(clearTimeout);
      playTimers.current = [];
    };
  }, []);

  const project = store.project;

  const handleSave = useCallback(async () => {
    if (project) await saveProject(project);
  }, [project]);

  useEffect(() => {
    // Autosave com debounce de 400ms (< 500ms do requisito da Fase 3).
    const timer = setTimeout(handleSave, 400);
    return () => clearTimeout(timer);
  }, [project, handleSave]);

  const handleGenerateEvents = useCallback(() => {
    const seed = Date.now();
    const mode = project?.timelineMode ?? "regular";
    const curve: GeneratorRules["curve"] =
      mode === "burst" ? "burst" : mode === "growth" ? "growth" : "constant";
    const rules = { ...DEFAULT_RULES, durationMs: 30000, curve };
    const events = generateEvents(rules, seed);
    store.reorderEvents(events);
  }, [store, project?.timelineMode]);

  const handleExport = useCallback(async () => {
    if (!project) return;
    setExporting(true);
    try {
      const event = project.events[0] ?? generateEvents(DEFAULT_RULES, 42)[0]!;
      const uri = await exportPng({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        event,
        style: project.platformStyle,
        theme: project.theme,
        disclosure: project.disclosure,
      });
      await sharePng(uri);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [project]);

  const handlePlay = useCallback(() => {
    if (!project || project.events.length === 0) return;
    playTimers.current.forEach(clearTimeout);
    playTimers.current = [];
    setPlaying(true);
    store.selectEvent(project.events[0]!.id);
    void playDemoSound(project.events[0]!.soundId);
    for (let i = 1; i < project.events.length; i++) {
      const delay = project.events[i]!.timeMs;
      const idx = i;
      const timer = setTimeout(() => {
        store.selectEvent(project.events[idx]!.id);
        void playDemoSound(project.events[idx]!.soundId);
        if (idx === project.events.length - 1) {
          const endTimer = setTimeout(() => setPlaying(false), 500);
          playTimers.current.push(endTimer);
        }
      }, delay);
      playTimers.current.push(timer);
    }
  }, [project, store]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    playTimers.current.forEach(clearTimeout);
    playTimers.current = [];
  }, []);

  const handleRestart = useCallback(() => {
    handlePause();
    if (project && project.events.length > 0) {
      store.selectEvent(project.events[0]!.id);
    }
  }, [handlePause, project, store]);

  if (!project) return null;

  const selectedEvent = project.events.find(
    (e) => e.id === store.selectedEventId,
  );

  const previewEvent =
    selectedEvent ??
    project.events[0] ??
    generateEvents(DEFAULT_RULES, 42)[0]!;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => { handleSave(); onBack(); }}
          accessibilityRole="button"
          accessibilityLabel="Voltar e salvar"
        >
          <Text style={styles.backBtn}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.projectName} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.previewContainer}>
        <NotificationRenderer
          event={previewEvent}
          style={project.platformStyle}
          theme={project.theme}
          disclosure={project.disclosure}
          canvasWidth={CANVAS_WIDTH / 3}
          canvasHeight={CANVAS_HEIGHT / 3}
        />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={`Aba ${tab.label}`}
            accessibilityState={{ selected: store.activeTab === tab.key }}
            style={[styles.tab, store.activeTab === tab.key && styles.tabActive]}
            onPress={() => store.setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                store.activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: 16 }}>
        {store.activeTab === "content" && (
          <ContentTab
            project={project}
            selectedEvent={selectedEvent}
            onSelectEvent={store.selectEvent}
            onUpdateEvent={store.updateEvent}
            onAddEvent={store.addEvent}
            onRemoveEvent={store.removeEvent}
            onGenerate={handleGenerateEvents}
          />
        )}
        {store.activeTab === "appearance" && (
          <AppearanceTab
            project={project}
            onUpdateProject={store.updateProject}
          />
        )}
        {store.activeTab === "timeline" && (
          <TimelineTab
            project={project}
            selectedEvent={selectedEvent}
            onSelectEvent={store.selectEvent}
            onReorder={store.reorderEvents}
            onUpdateProject={store.updateProject}
            playing={playing}
            onPlay={handlePlay}
            onPause={handlePause}
            onRestart={handleRestart}
          />
        )}
        {store.activeTab === "export" && (
          <ExportTab
            project={project}
            onExport={handleExport}
            exporting={exporting}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ContentTab({
  project,
  selectedEvent,
  onSelectEvent,
  onUpdateEvent,
  onAddEvent,
  onRemoveEvent,
  onGenerate,
}: {
  project: Project;
  selectedEvent: SaleEvent | undefined;
  onSelectEvent: (id: string | null) => void;
  onUpdateEvent: (id: string, patch: Partial<SaleEvent>) => void;
  onAddEvent: (event: SaleEvent) => void;
  onRemoveEvent: (id: string) => void;
  onGenerate: () => void;
}) {
  return (
    <View>
      <TouchableOpacity
        style={styles.genBtn}
        onPress={onGenerate}
        accessibilityRole="button"
        accessibilityLabel="Gerar dados demonstrativos"
      >
        <Text style={styles.genBtnText}>Gerar dados demonstrativos</Text>
      </TouchableOpacity>

      {project.events.length > 0 && (
        <View style={styles.eventList}>
          {project.events.map((e) => (
            <TouchableOpacity
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${e.title}, ${e.quantity}x ${e.productName}`}
              accessibilityState={{ selected: selectedEvent?.id === e.id }}
              style={[
                styles.eventItem,
                selectedEvent?.id === e.id && styles.eventItemActive,
              ]}
              onPress={() => onSelectEvent(e.id)}
            >
              <Text style={styles.eventItemText} numberOfLines={1}>
                {e.title} - {e.quantity}x {e.productName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedEvent && (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Titulo</Text>
          <TextInput
            style={styles.input}
            value={selectedEvent.title}
            onChangeText={(v) => onUpdateEvent(selectedEvent.id, { title: v })}
          />
          <Text style={styles.fieldLabel}>Loja</Text>
          <TextInput
            style={styles.input}
            value={selectedEvent.storeName}
            onChangeText={(v) =>
              onUpdateEvent(selectedEvent.id, { storeName: v })
            }
          />
          <Text style={styles.fieldLabel}>Produto</Text>
          <TextInput
            style={styles.input}
            value={selectedEvent.productName}
            onChangeText={(v) =>
              onUpdateEvent(selectedEvent.id, { productName: v })
            }
          />
          <Text style={styles.fieldLabel}>Quantidade</Text>
          <TextInput
            style={styles.input}
            value={String(selectedEvent.quantity)}
            keyboardType="numeric"
            onChangeText={(v) =>
              onUpdateEvent(selectedEvent.id, {
                quantity: Math.max(1, parseInt(v) || 1),
              })
            }
          />
          <Text style={styles.fieldLabel}>Valor (centavos)</Text>
          <TextInput
            style={styles.input}
            value={String(selectedEvent.amountCents)}
            keyboardType="numeric"
            onChangeText={(v) =>
              onUpdateEvent(selectedEvent.id, {
                amountCents: Math.max(0, parseInt(v) || 0),
              })
            }
          />
          <Text style={styles.fieldLabel}>Moeda</Text>
          <View style={styles.optionRow}>
            {(["BRL", "USD", "EUR"] as const).map((c) => (
              <TouchableOpacity
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Moeda ${c}`}
                accessibilityState={{ selected: selectedEvent.currency === c }}
                style={[
                  styles.optionBtn,
                  selectedEvent.currency === c && styles.optionBtnActive,
                ]}
                onPress={() => onUpdateEvent(selectedEvent.id, { currency: c })}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedEvent.currency === c && styles.optionTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Horario (ms)</Text>
          <TextInput
            style={styles.input}
            value={String(selectedEvent.timeMs)}
            keyboardType="numeric"
            onChangeText={(v) =>
              onUpdateEvent(selectedEvent.id, {
                timeMs: Math.max(0, parseInt(v) || 0),
              })
            }
          />
          <Text style={styles.fieldLabel}>Apelido do comprador (opcional)</Text>
          <TextInput
            style={styles.input}
            value={selectedEvent.buyerAlias ?? ""}
            onChangeText={(v) =>
              onUpdateEvent(selectedEvent.id, {
                buyerAlias: v || undefined,
              })
            }
          />
          <Text style={styles.fieldLabel}>Som demonstrativo (opcional)</Text>
          <View style={styles.optionRow}>
            {(["none", ...Object.keys(SOUND_PRESETS)] as const).map((s) => (
              <TouchableOpacity
                key={s}
                accessibilityRole="button"
                accessibilityLabel={`Som ${s === "none" ? "desativado" : SOUND_PRESETS[s as keyof typeof SOUND_PRESETS].label}`}
                accessibilityState={{ selected: (selectedEvent.soundId ?? "none") === s }}
                style={[
                  styles.optionBtn,
                  (selectedEvent.soundId ?? "none") === s &&
                    styles.optionBtnActive,
                ]}
                onPress={() =>
                  onUpdateEvent(selectedEvent.id, {
                    soundId: s === "none" ? undefined : s,
                  })
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    (selectedEvent.soundId ?? "none") === s &&
                      styles.optionTextActive,
                  ]}
                >
                  {s === "none"
                    ? "Sem som"
                    : SOUND_PRESETS[s as keyof typeof SOUND_PRESETS].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Remover evento selecionado"
            style={styles.deleteEventBtn}
            onPress={() => onRemoveEvent(selectedEvent.id)}
          >
            <Text style={styles.deleteEventText}>Remover evento</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.addEventBtn}
        accessibilityRole="button"
        accessibilityLabel="Adicionar evento manual"
        onPress={() => {
          const now = Date.now();
          onAddEvent({
            id: `evt-${now}-${Math.random().toString(36).slice(2, 6)}`,
            timeMs: project.events.length * 6000,
            title: "Nova venda demonstrativa",
            storeName: "Loja Exemplo",
            productName: "Produto Exemplo",
            quantity: 1,
            amountCents: 8970,
            currency: "BRL",
          });
        }}
      >
        <Text style={styles.addEventText}>Adicionar evento manual</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppearanceTab({
  project,
  onUpdateProject,
}: {
  project: Project;
  onUpdateProject: (patch: Partial<Project>) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Estilo</Text>
      <View style={styles.optionRow}>
        {STYLES.map((s) => (
          <TouchableOpacity
             accessibilityRole="button"
            key={s}
            accessibilityState={{ selected: project.platformStyle === s }}
            style={[
              styles.optionBtn,
              project.platformStyle === s && styles.optionBtnActive,
            ]}
            onPress={() => onUpdateProject({ platformStyle: s })}
          >
            <Text
              style={[
                styles.optionText,
                project.platformStyle === s && styles.optionTextActive,
              ]}
            >
              {s === "ios-inspired" ? "Inspirado em iPhone" : s === "android-inspired" ? "Inspirado em Android" : "Generico"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Tema</Text>
      <View style={styles.optionRow}>
        {(["light", "dark"] as const).map((t) => (
          <TouchableOpacity
             accessibilityRole="button"
            key={t}
            accessibilityState={{ selected: project.theme === t }}
            style={[
              styles.optionBtn,
              project.theme === t && styles.optionBtnActive,
            ]}
            onPress={() => onUpdateProject({ theme: t })}
          >
            <Text
              style={[
                styles.optionText,
                project.theme === t && styles.optionTextActive,
              ]}
            >
              {t === "light" ? "Claro" : "Escuro"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Fundo</Text>
      <View style={styles.optionRow}>
        {(["solid", "gradient"] as const).map((k) => (
          <TouchableOpacity
             accessibilityRole="button"
            key={k}
            accessibilityState={{ selected: project.background.kind === k }}
            style={[
              styles.optionBtn,
              project.background.kind === k && styles.optionBtnActive,
            ]}
            onPress={() =>
              onUpdateProject({
                background: { ...project.background, kind: k },
              })
            }
          >
            <Text
              style={[
                styles.optionText,
                project.background.kind === k && styles.optionTextActive,
              ]}
            >
              {k === "solid" ? "Solido" : "Gradiente"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Aviso de demonstracao</Text>
      <View style={styles.optionRow}>
        {(["top", "bottom"] as const).map((p) => (
          <TouchableOpacity
             accessibilityRole="button"
            key={p}
            accessibilityState={{ selected: project.disclosure.position === p }}
            style={[
              styles.optionBtn,
              project.disclosure.position === p && styles.optionBtnActive,
            ]}
            onPress={() =>
              onUpdateProject({
                disclosure: { ...project.disclosure, position: p },
              })
            }
          >
            <Text
              style={[
                styles.optionText,
                project.disclosure.position === p && styles.optionTextActive,
              ]}
            >
              {p === "top" ? "Topo" : "Rodape"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TimelineTab({
  project,
  selectedEvent,
  onSelectEvent,
  onReorder,
  onUpdateProject,
  playing,
  onPlay,
  onPause,
  onRestart,
}: {
  project: Project;
  selectedEvent: SaleEvent | undefined;
  onSelectEvent: (id: string | null) => void;
  onReorder: (events: readonly SaleEvent[]) => void;
  onUpdateProject: (patch: Partial<Project>) => void;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Modo</Text>
      <View style={styles.optionRow}>
        {TIMELINE_MODES.map((m) => (
          <TouchableOpacity
             accessibilityRole="button"
            key={m}
            accessibilityState={{ selected: project.timelineMode === m }}
            style={[
              styles.optionBtn,
              project.timelineMode === m && styles.optionBtnActive,
            ]}
            onPress={() => onUpdateProject({ timelineMode: m })}
          >
            <Text
              style={[
                styles.optionText,
                project.timelineMode === m && styles.optionTextActive,
              ]}
            >
              {TIMELINE_MODE_LABELS[m]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Controles</Text>
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={playing ? onPause : onPlay}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pausar pré-visualização" : "Reproduzir pré-visualização"}
        >
          <Text style={styles.controlText}>{playing ? "Pausar" : "Play"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={onRestart}
          accessibilityRole="button"
          accessibilityLabel="Reiniciar pré-visualização"
        >
          <Text style={styles.controlText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Eventos ({project.events.length})</Text>
      {project.events.map((e, i) => (
        <TouchableOpacity
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`Evento ${i + 1}: ${e.title}`}
          accessibilityState={{ selected: selectedEvent?.id === e.id }}
          style={[
            styles.timelineItem,
            selectedEvent?.id === e.id && styles.timelineItemActive,
          ]}
          onPress={() => onSelectEvent(e.id)}
        >
          <Text style={styles.timelineIdx}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineText} numberOfLines={1}>
              {e.title}
            </Text>
            <Text style={styles.timelineMeta}>
              {formatCurrency(e.amountCents * e.quantity, e.currency)} ·{" "}
              {(e.timeMs / 1000).toFixed(0)}s
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {project.events.length > 1 && (
        <View style={styles.reorderRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mover evento selecionado para cima"
            style={styles.controlBtn}
            onPress={() => {
              if (!selectedEvent) return;
              const idx = project.events.findIndex(
                (e) => e.id === selectedEvent.id,
              );
              if (idx <= 0) return;
              const arr = [...project.events];
              [arr[idx - 1], arr[idx]] = [arr[idx]!, arr[idx - 1]!];
              onReorder(arr);
            }}
          >
            <Text style={styles.controlText}>Mover cima</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mover evento selecionado para baixo"
            style={styles.controlBtn}
            onPress={() => {
              if (!selectedEvent) return;
              const idx = project.events.findIndex(
                (e) => e.id === selectedEvent.id,
              );
              if (idx >= project.events.length - 1) return;
              const arr = [...project.events];
              [arr[idx], arr[idx + 1]] = [arr[idx + 1]!, arr[idx]!];
              onReorder(arr);
            }}
          >
            <Text style={styles.controlText}>Mover baixo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ExportTab({
  project,
  onExport,
  exporting,
}: {
  project: Project;
  onExport: () => void;
  exporting: boolean;
}) {
  const { jobs, enqueue, cancel } = useExportQueue();
  const [videoSupported, setVideoSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    videoExportSupported().then((ok) => {
      if (active) setVideoSupported(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  const activeJob = jobs
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .find((j) => j.status === "render" || j.status === "encode" || j.status === "queued");
  const lastJob = jobs[jobs.length - 1];

  return (
    <View>
      <View style={styles.exportInfo}>
        <Text style={styles.exportTitle}>Exportar PNG</Text>
        <Text style={styles.exportDesc}>
          Imagem 1080x1920 com aviso de demonstracao incorporado.
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
        onPress={onExport}
        disabled={exporting}
        accessibilityRole="button"
        accessibilityLabel="Exportar imagem PNG e compartilhar"
        accessibilityState={{ disabled: exporting }}
      >
        <Text style={styles.exportBtnText}>
          {exporting ? "Exportando..." : "Exportar e compartilhar"}
        </Text>
      </TouchableOpacity>

      <View style={styles.exportInfo}>
        <Text style={styles.exportTitle}>Exportar GIF</Text>
        <Text style={styles.exportDesc}>
          GIF animado 540x960 12fps com animacoes deterministas e aviso de
          demonstracao em todos os frames.
        </Text>
      </View>
      {activeJob ? (
        <View>
          <Text style={styles.exportDesc}>
            {activeJob.status === "queued"
              ? "Na fila..."
              : `${activeJob.status === "render" ? "Renderizando" : "Codificando"} ${Math.round(
                  activeJob.progress * 100,
                )}%`}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancelar exportação"
            style={[styles.exportBtn, styles.cancelBtn]}
            onPress={() => cancel(activeJob.id)}
          >
            <Text style={styles.exportBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => enqueue(project)}
          accessibilityRole="button"
          accessibilityLabel="Exportar GIF animado"
        >
          <Text style={styles.exportBtnText}>Exportar GIF</Text>
        </TouchableOpacity>
      )}
      {videoSupported === false && (
        <Text style={styles.exportDesc}>
          Exportacao em GIF animado (540x960, 12 fps, max 10s) com aviso de
          demonstracao em todos os frames.
        </Text>
      )}
      {lastJob?.status === "error" && (
        <Text style={styles.exportDesc}>{lastJob.error}</Text>
      )}
      {lastJob?.status === "done" && (
        <Text style={styles.exportDesc}>
          GIF gerado com {lastJob.result?.frameCount ?? 0} frames (
          {((lastJob.result?.durationMs ?? 0) / 1000).toFixed(1)}s).
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { fontSize: 16, color: "#5E5CE6" },
  projectName: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  previewContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#1A1A1A" },
  tabText: { fontSize: 14, color: "#888" },
  tabTextActive: { color: "#1A1A1A", fontWeight: "600" },
  tabContent: { flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#E8E8E8",
  },
  optionBtnActive: { backgroundColor: "#1A1A1A" },
  optionText: { fontSize: 14, color: "#666" },
  optionTextActive: { color: "#FFF" },
  fieldGroup: { marginTop: 16 },
  fieldLabel: { fontSize: 13, color: "#888", marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFF",
  },
  genBtn: {
    backgroundColor: "#5E5CE6",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  genBtnText: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  eventList: { marginBottom: 12 },
  eventItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginBottom: 6,
  },
  eventItemActive: { backgroundColor: "#E8E4FF" },
  eventItemText: { fontSize: 14, color: "#333" },
  deleteEventBtn: { marginTop: 12, padding: 12, alignItems: "center" },
  deleteEventText: { color: "#E53935", fontSize: 14 },
  addEventBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
    marginTop: 8,
  },
  addEventText: { color: "#5E5CE6", fontSize: 15, fontWeight: "600" },
  controlRow: { flexDirection: "row", gap: 8 },
  controlBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
  },
  controlText: { fontSize: 14, color: "#333" },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    marginBottom: 6,
    gap: 12,
  },
  timelineItemActive: { backgroundColor: "#E8E4FF" },
  timelineIdx: { fontSize: 14, fontWeight: "600", color: "#999", width: 24 },
  timelineText: { fontSize: 14, color: "#333" },
  timelineMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  reorderRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  exportInfo: { marginBottom: 20 },
  exportTitle: { fontSize: 20, fontWeight: "700" },
  exportDesc: { fontSize: 14, color: "#888", marginTop: 8 },
  exportBtn: {
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  exportBtnDisabled: { opacity: 0.5 },
  cancelBtn: { backgroundColor: "#E53935", marginTop: 8 },
  exportBtnText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
});
