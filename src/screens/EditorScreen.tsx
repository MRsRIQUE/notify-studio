import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEditorStore, type EditorTab } from "../state/editorStore";
import type {
  Project,
  SaleEvent,
  PlatformStyle,
  TimelineMode,
  BackgroundConfig,
} from "../domain/types";
import {
  generateEvents,
  generateEventsFromProducts,
  DEFAULT_RULES,
} from "../domain/generator";
import { commissionCents } from "../domain/product";
import type { Product } from "../domain/product";
import type { GeneratorRules } from "../domain/generator";
import { formatCurrency } from "../domain/currency";
import { computePreviewSize } from "../domain/previewLayout";
import { NotificationRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from "../rendering/NotificationRenderer";
import { saveProject, getAllProducts } from "../persistence/database";
import { exportPng, sharePng } from "../platform/exportPng";
import { shareGif } from "../platform/share";
import { playDemoSound, SOUND_PRESETS } from "../platform/sound";
import { useExportQueue } from "../state/exportQueue";
import { validateDisclosure } from "../domain/disclosure";
import { disclosureBarMetrics } from "../rendering/drawNotification";
import { Button, EmptyState, Header, Screen } from "../ui/components";
import { colors, radius, shadow, spacing, typography } from "../ui/theme";

type Props = {
  project: Project;
  onBack: () => void;
  onDeviceTest?: (project: Project) => void;
};

const TABS: { key: EditorTab; label: string }[] = [
  { key: "content", label: "Conteúdo" },
  { key: "appearance", label: "Aparência" },
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
  single: "Único",
  regular: "Regular",
  burst: "Rajada",
  growth: "Crescimento",
  manual: "Manual",
};

const BACKGROUND_KINDS: BackgroundConfig["kind"][] = [
  "auto",
  "solid",
  "gradient",
];

const BACKGROUND_KIND_LABELS: Record<BackgroundConfig["kind"], string> = {
  auto: "Automático",
  solid: "Sólido",
  gradient: "Gradiente",
};

// Presets de fundo com contraste suficiente para a barra de aviso
// (rgba(0,0,0,0.75) + texto branco) e para o card.
const BACKGROUND_PRESETS: { label: string; color: string; colorEnd: string }[] = [
  { label: "Neutro", color: "#F2F2F7", colorEnd: "#D8D8E0" },
  { label: "Grafite", color: "#0B0B0F", colorEnd: "#2A2A33" },
  { label: "Indigo", color: "#5E5CE6", colorEnd: "#2C2A9E" },
  { label: "Verde", color: "#3DDC84", colorEnd: "#0F7A45" },
  { label: "Coral", color: "#FF6B6B", colorEnd: "#B32D2D" },
  { label: "Areia", color: "#F6E3C5", colorEnd: "#C9A46A" },
];

export function EditorScreen({
  project: initialProject,
  onBack,
  onDeviceTest,
}: Props) {
  const store = useEditorStore();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [playing, setPlaying] = useState(false);
  const [catalog, setCatalog] = useState<readonly Product[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelado = false;
    getAllProducts()
      .then((p) => {
        if (!cancelado) setCatalog(p);
      })
      .catch(() => {
        // Catalogo indisponivel: o gerador cai no modo sem produtos.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const selectedEvent = useMemo(
    () => project?.events.find((e) => e.id === store.selectedEventId),
    [project?.events, store.selectedEventId],
  );

  // Evento mostrado no preview e usado no export PNG: o selecionado, senao o
  // primeiro do projeto, senao um evento sintetico (projeto vazio).
  const previewEvent = useMemo(
    () =>
      selectedEvent ??
      project?.events[0] ??
      generateEvents(DEFAULT_RULES, 42)[0]!,
    [selectedEvent, project?.events],
  );

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
    const events =
      catalog.length > 0
        ? generateEventsFromProducts(catalog, rules, seed)
        : generateEvents(rules, seed);
    store.reorderEvents(events);
  }, [store, project?.timelineMode, catalog]);

  const handleExport = useCallback(async () => {
    if (!project) return;
    setExporting(true);
    setExportError(null);
    try {
      const uri = await exportPng({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        event: previewEvent,
        style: project.platformStyle,
        theme: project.theme,
        disclosure: project.disclosure,
        background: project.background,
      });
      await sharePng(uri);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Falha ao exportar o PNG.",
      );
    } finally {
      setExporting(false);
    }
  }, [project, previewEvent]);

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

  const [disclosureValid, setDisclosureValid] = useState<boolean | null>(null);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project) return;
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    validationTimerRef.current = setTimeout(() => {
      const metrics = disclosureBarMetrics({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        style: project.platformStyle,
        theme: project.theme,
        disclosure: project.disclosure,
      });
      const result = validateDisclosure(project.disclosure, {
        height: CANVAS_HEIGHT,
        barY: metrics.barY,
        barHeight: metrics.barHeight,
      });
      setDisclosureValid(result.ok);
    }, 300);
    return () => {
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    };
  }, [project?.disclosure, project?.platformStyle, project?.theme]);

  const { previewWidth, previewHeight } = useMemo(
    () =>
      computePreviewSize(windowWidth, windowHeight, insets.top + insets.bottom),
    [windowWidth, windowHeight, insets.top, insets.bottom],
  );

  if (!project) return null;

  return (
    <Screen>
      <Header
        title={project.name}
        subtitle="Toque em voltar para salvar"
        onBack={() => {
          handleSave();
          onBack();
        }}
      />

      <View style={[styles.previewContainer, { width: previewWidth, height: previewHeight }]}>
        <NotificationRenderer
          event={previewEvent}
          style={project.platformStyle}
          theme={project.theme}
          disclosure={project.disclosure}
          background={project.background}
          canvasWidth={previewWidth}
          canvasHeight={previewHeight}
          playing={playing}
        />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isExportTab = tab.key === "export";
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={`Aba ${tab.label}`}
              accessibilityState={{ selected: store.activeTab === tab.key }}
              style={[styles.tab, store.activeTab === tab.key && styles.tabActive]}
              onPress={() => store.setActiveTab(tab.key)}
            >
              <View style={styles.tabLabelContainer}>
                <Text
                  style={[
                    styles.tabText,
                    store.activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {isExportTab && disclosureValid !== null && (
                  <View
                    style={[
                      styles.disclosureIndicator,
                      disclosureValid ? styles.disclosureValid : styles.disclosureInvalid,
                    ]}
                    accessibilityLabel={
                      disclosureValid
                        ? "Aviso de demonstração visível"
                        : "Aviso de demonstração fora da área visível"
                    }
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}
      >
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
            exportError={exportError}
            onDeviceTest={
              onDeviceTest ? () => { handleSave(); onDeviceTest(project); } : undefined
            }
          />
        )}
      </ScrollView>
    </Screen>
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
  const hasEvents = project.events.length > 0;

  return (
    <View>
      {hasEvents ? (
        <>
          <Button
            label="Gerar dados demonstrativos"
            icon="plus"
            onPress={onGenerate}
            style={styles.genBtn}
          />

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
        </>
      ) : (
        <View style={styles.emptyContent}>
          <EmptyState
            icon="live"
            title="Nenhum evento de venda"
            hint="Adicione eventos manualmente ou gere dados demonstrativos para pré-visualizar."
            action={
              <Button
                label="Gerar eventos demonstrativos"
                icon="plus"
                onPress={onGenerate}
              />
            }
          />
        </View>
      )}

      {selectedEvent && (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Título</Text>
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
          <Text style={styles.fieldLabel}>Horário (ms)</Text>
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
          <Button
            label="Remover evento"
            icon="trash"
            variant="danger"
            accessibilityLabel="Remover evento selecionado"
            onPress={() => onRemoveEvent(selectedEvent.id)}
            style={styles.deleteEventBtn}
          />
        </View>
      )}

      <Button
        label="Adicionar evento manual"
        icon="plus"
        variant="secondary"
        style={styles.addEventBtn}
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
      />
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
              {s === "ios-inspired" ? "Inspirado em iPhone" : s === "android-inspired" ? "Inspirado em Android" : "Genérico"}
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
        {BACKGROUND_KINDS.map((k) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={k}
            accessibilityLabel={`Fundo ${BACKGROUND_KIND_LABELS[k]}`}
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
              {BACKGROUND_KIND_LABELS[k]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {project.background.kind === "auto" ? (
        <Text style={styles.fieldHint}>
          O fundo acompanha o tema escolhido acima.
        </Text>
      ) : (
        <View style={styles.swatchRow}>
          {BACKGROUND_PRESETS.map((preset) => {
            const selected =
              project.background.color.toUpperCase() ===
              preset.color.toUpperCase();
            return (
              <TouchableOpacity
                key={preset.label}
                accessibilityRole="button"
                accessibilityLabel={`Cor de fundo ${preset.label}`}
                accessibilityState={{ selected }}
                style={[styles.swatch, selected && styles.swatchActive]}
                onPress={() =>
                  onUpdateProject({
                    background: {
                      kind: project.background.kind,
                      color: preset.color,
                      colorEnd: preset.colorEnd,
                    },
                  })
                }
              >
                <View
                  style={[styles.swatchFill, { backgroundColor: preset.color }]}
                />
                {project.background.kind === "gradient" && (
                  <View
                    style={[
                      styles.swatchFill,
                      { backgroundColor: preset.colorEnd },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Aviso de demonstração</Text>
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
              {p === "top" ? "Topo" : "Rodapé"}
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
        <Button
          label={playing ? "Pausar" : "Reproduzir"}
          icon={playing ? "pause" : "play"}
          variant="secondary"
          style={styles.controlBtn}
          accessibilityLabel={
            playing ? "Pausar pré-visualização" : "Reproduzir pré-visualização"
          }
          onPress={playing ? onPause : onPlay}
        />
        <Button
          label="Reiniciar"
          variant="secondary"
          style={styles.controlBtn}
          accessibilityLabel="Reiniciar pré-visualização"
          onPress={onRestart}
        />
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
              {e.commissionBp !== undefined && e.commissionBp > 0
                ? ` · comissão ${formatCurrency(
                    commissionCents(e.amountCents, e.quantity, e.commissionBp),
                    e.currency,
                  )}`
                : ""}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {project.events.length > 1 && (
        <View style={styles.reorderRow}>
          <Button
            label="Mover cima"
            variant="secondary"
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
          />
          <Button
            label="Mover baixo"
            variant="secondary"
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
          />
        </View>
      )}
    </View>
  );
}

function ExportTab({
  project,
  onExport,
  exporting,
  exportError,
  onDeviceTest,
}: {
  project: Project;
  onExport: () => void;
  exporting: boolean;
  exportError: string | null;
  onDeviceTest?: () => void;
}) {
  const { jobs, enqueue, cancel } = useExportQueue();
  const [gifShareError, setGifShareError] = useState<string | null>(null);

  const activeJob = jobs
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .find((j) => j.status === "render" || j.status === "encode" || j.status === "queued");
  const lastJob = jobs[jobs.length - 1];

  const handleShareGif = useCallback(async (uri: string) => {
    setGifShareError(null);
    try {
      await shareGif(uri);
    } catch (err) {
      setGifShareError(
        err instanceof Error ? err.message : "Falha ao compartilhar o GIF.",
      );
    }
  }, []);

  return (
    <View>
      <View style={styles.exportInfo}>
        <Text style={styles.exportTitle}>Exportar PNG</Text>
        <Text style={styles.exportDesc}>
          Imagem 1080x1920 com aviso de demonstração incorporado.
        </Text>
      </View>
      <Button
        label={exporting ? "Exportando..." : "Exportar e compartilhar"}
        icon="share"
        loading={exporting}
        accessibilityLabel="Exportar imagem PNG e compartilhar"
        style={styles.exportBtn}
        onPress={onExport}
      />
      {exportError && (
        <Text style={styles.exportError} accessibilityRole="alert">
          {exportError}
        </Text>
      )}

      <View style={[styles.exportInfo, styles.exportInfoSpaced]}>
        <Text style={styles.exportTitle}>Exportar GIF</Text>
        <Text style={styles.exportDesc}>
          GIF animado 540x960 12fps com animações deterministas e aviso de
          demonstração em todos os frames.
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
          <Button
            label="Cancelar"
            variant="danger"
            accessibilityLabel="Cancelar exportação"
            style={styles.exportBtn}
            onPress={() => cancel(activeJob.id)}
          />
        </View>
      ) : (
        <Button
          label="Exportar GIF"
          icon="share"
          accessibilityLabel="Exportar GIF animado"
          style={styles.exportBtn}
          onPress={() => enqueue(project)}
        />
      )}
      {lastJob?.status === "error" && (
        <Text style={styles.exportError} accessibilityRole="alert">
          {lastJob.error}
        </Text>
      )}
      {lastJob?.status === "cancelled" && (
        <Text style={styles.exportDesc}>Exportação cancelada.</Text>
      )}
      {lastJob?.status === "done" && lastJob.result && (
        <View>
          <Text style={styles.exportDesc}>
            GIF gerado com {lastJob.result.frameCount} frames (
            {(lastJob.result.durationMs / 1000).toFixed(1)}s).
          </Text>
          <Button
            label="Compartilhar GIF"
            icon="share"
            accessibilityLabel="Compartilhar GIF gerado"
            style={styles.exportBtn}
            onPress={() => handleShareGif(lastJob.result!.uri)}
          />
          {gifShareError && (
            <Text style={styles.exportError} accessibilityRole="alert">
              {gifShareError}
            </Text>
          )}
        </View>
      )}

      {onDeviceTest && (
        <>
          <View style={[styles.exportInfo, styles.exportInfoSpaced]}>
            <Text style={styles.exportTitle}>Testar no aparelho</Text>
            <Text style={styles.exportDesc}>
              Dispara notificações reais do sistema com os dados simulados do
              projeto, respeitando os limites diários.
            </Text>
          </View>
          <Button
            label="Abrir teste no aparelho"
            icon="live"
            accessibilityLabel="Abrir teste de notificações no aparelho"
            style={styles.exportBtn}
            onPress={onDeviceTest}
          />
        </>
      )}
    </View>
  );
}

// Todo estilo de texto sai de `typography`, que carrega o fontFamily "Roboto".
// Sem ele o Android da Motorola desenha com MotoRoboto e corta o fim das
// palavras — foi nesta tela que o bug apareceu primeiro ("Voltar" -> "Volta").
const styles = StyleSheet.create({
  previewContainer: {
    // alignSelf centraliza o proprio container; alignItems so centralizaria os
    // filhos. Sem ele o preview, agora mais estreito, encostaria na esquerda.
    alignSelf: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.label, fontSize: 13 },
  tabTextActive: { color: colors.textOnPrimary },
  tabContent: { flex: 1 },
  tabLabelContainer: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  disclosureIndicator: { width: 8, height: 8, borderRadius: radius.pill },
  disclosureValid: { backgroundColor: colors.success },
  disclosureInvalid: { backgroundColor: colors.danger },

  sectionTitle: {
    ...typography.label,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { ...typography.body, fontSize: 14, color: colors.textMuted },
  optionTextActive: { color: colors.textOnPrimary, fontWeight: "600" },

  fieldGroup: { marginTop: spacing.lg },
  fieldLabel: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.md },
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.md,
    lineHeight: 19,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: "hidden",
    flexDirection: "column",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: { borderColor: colors.primary },
  swatchFill: { flex: 1, width: "100%" },

  genBtn: { marginBottom: spacing.lg },
  eventList: { marginBottom: spacing.md, gap: spacing.sm },
  eventItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
  },
  eventItemText: { ...typography.body, fontSize: 14 },
  deleteEventBtn: { marginTop: spacing.md },
  addEventBtn: { marginTop: spacing.sm },

  emptyContent: { paddingVertical: spacing.xxl },

  controlRow: { flexDirection: "row", gap: spacing.sm },
  controlBtn: { flexGrow: 1, flexShrink: 1 },

  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  timelineItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
  },
  timelineIdx: { ...typography.subtitle, fontSize: 14, color: colors.primary, width: 24 },
  timelineText: { ...typography.body, fontSize: 14 },
  timelineMeta: { ...typography.caption, fontSize: 12, marginTop: 2 },
  reorderRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },

  exportInfo: { marginBottom: spacing.lg },
  exportInfoSpaced: { marginTop: spacing.xxxl },
  exportTitle: { ...typography.title },
  exportDesc: { ...typography.caption, marginTop: spacing.sm, lineHeight: 19 },
  exportBtn: { marginTop: spacing.sm },
  exportError: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
});
