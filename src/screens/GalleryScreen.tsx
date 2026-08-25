import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import type { Project } from "../domain/types";
import { DEFAULT_DISCLOSURE } from "../domain/types";
import {
  getAllProjects,
  saveProject,
  deleteProject,
  duplicateProject,
} from "../persistence/database";
import { TEMPLATES } from "../domain/templates";
import { generateEvents, DEFAULT_RULES } from "../domain/generator";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
};

export function GalleryScreen({ onSelectProject, onNewProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [renameText, setRenameText] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadProjects = useCallback(async () => {
    const loaded = await getAllProjects();
    if (mountedRef.current) setProjects(loaded);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = (project: Project) => {
    Alert.alert(
      "Excluir projeto",
      `Excluir "${project.name}"? Esta acao nao pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteProject(project.id);
            await loadProjects();
          },
        },
      ],
    );
  };

  const handleDuplicate = async (project: Project) => {
    await duplicateProject(project.id, `${project.name} (copia)`);
    await loadProjects();
  };

  const handleRename = (project: Project) => {
    setRenaming(project);
    setRenameText(project.name);
  };

  const confirmRename = async () => {
    if (!renaming || !renameText.trim()) return;
    await saveProject({
      ...renaming,
      name: renameText.trim(),
      updatedAt: new Date().toISOString(),
    });
    setRenaming(null);
    await loadProjects();
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const now = new Date().toISOString();
    const newId = generateId("proj");
    const project: Project = {
      id: newId,
      name: tpl.name,
      format: "vertical-9x16",
      platformStyle: "ios-inspired",
      theme: "light",
      background: { kind: "solid", color: "#F2F2F7" },
      disclosure: DEFAULT_DISCLOSURE,
      timelineMode: tpl.timelineMode,
      events: tpl.events.map((e) => ({
        ...e,
        id: `evt-${newId}-${e.id}`,
      })),
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    await saveProject(project);
    setShowTemplates(false);
    await loadProjects();
    onSelectProject(project);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NotifyStudio</Text>
        <Text style={styles.subtitle}>Seus projetos</Text>
      </View>

      {projects.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIllustration}>
            <Text style={styles.emptyIcon}>📱</Text>
          </View>
          <Text style={styles.emptyText}>Nenhum projeto ainda</Text>
          <Text style={styles.emptyHint}>
            Crie seu primeiro projeto e comece a simular notificacoes de venda.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={onNewProject}
            accessibilityRole="button"
            accessibilityLabel="Criar primeiro projeto"
          >
            <Text style={styles.emptyActionText}>Criar primeiro projeto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
          accessibilityRole="button"
              style={styles.card}
              onPress={() => onSelectProject(item)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.events.length} evento(s) · {item.platformStyle}
                </Text>
                <Text style={styles.cardDate}>
                  {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
          accessibilityRole="button"
                  style={styles.actionBtn}
                  onPress={() => handleRename(item)}
                >
                  <Text style={styles.actionText}>Renomear</Text>
                </TouchableOpacity>
                <TouchableOpacity
          accessibilityRole="button"
                  style={styles.actionBtn}
                  onPress={() => handleDuplicate(item)}
                >
                  <Text style={styles.actionText}>Duplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity
          accessibilityRole="button"
                  style={styles.actionBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={[styles.actionText, { color: "#E53935" }]}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.primaryBtn}
          onPress={onNewProject}
        >
          <Text style={styles.primaryText}>Novo projeto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.secondaryBtn}
          onPress={() => setShowTemplates(true)}
        >
          <Text style={styles.secondaryText}>Usar template</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTemplates} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolher template</Text>
            {TEMPLATES.map((tpl) => (
              <TouchableOpacity
          accessibilityRole="button"
                key={tpl.id}
                style={styles.templateCard}
                onPress={() => handleCreateFromTemplate(tpl.id)}
              >
                <Text style={styles.templateName}>{tpl.name}</Text>
                <Text style={styles.templateDesc}>{tpl.description}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
          accessibilityRole="button"
              style={styles.cancelBtn}
              onPress={() => setShowTemplates(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!renaming} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Renomear projeto</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              placeholder="Nome do projeto"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
          accessibilityRole="button"
                style={styles.cancelBtn}
                onPress={() => setRenaming(null)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
          accessibilityRole="button"
                style={styles.primaryBtn}
                onPress={confirmRename}
              >
                <Text style={styles.primaryText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#1A1A1A" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 4 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyIllustration: { marginBottom: 16 },
  emptyIcon: { fontSize: 64 },
  emptyText: { fontSize: 20, fontWeight: "600", color: "#333", textAlign: "center" },
  emptyHint: { fontSize: 15, color: "#888", marginTop: 8, textAlign: "center", lineHeight: 22 },
  emptyActionBtn: {
    marginTop: 24,
    backgroundColor: "#5E5CE6",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyActionText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  cardContent: { marginBottom: 8 },
  cardName: { fontSize: 17, fontWeight: "600", color: "#1A1A1A" },
  cardMeta: { fontSize: 13, color: "#888", marginTop: 4 },
  cardDate: { fontSize: 12, color: "#AAA", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 12 },
  actionBtn: { paddingVertical: 4 },
  actionText: { fontSize: 13, color: "#5E5CE6" },
  footer: { padding: 20, gap: 10 },
  primaryBtn: {
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  secondaryBtn: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  secondaryText: { fontSize: 16, fontWeight: "600", color: "#333" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  templateCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    marginBottom: 10,
  },
  templateName: { fontSize: 16, fontWeight: "600" },
  templateDesc: { fontSize: 13, color: "#888", marginTop: 4 },
  cancelBtn: { padding: 16, alignItems: "center", marginTop: 8 },
  cancelText: { fontSize: 16, color: "#888" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 12 },
});
