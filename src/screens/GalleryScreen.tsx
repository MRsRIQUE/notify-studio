import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Screen,
  Header,
  Card,
  Button,
  EmptyState,
} from "../ui/components";
import { Icon } from "../ui/Icon";
import { colors, radius, spacing, typography } from "../ui/theme";
import type { Project } from "../domain/types";
import { DEFAULT_BACKGROUND, DEFAULT_DISCLOSURE } from "../domain/types";
import {
  getAllProjects,
  saveProject,
  deleteProject,
  duplicateProject,
} from "../persistence/database";
import { TEMPLATES } from "../domain/templates";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
};

export function GalleryScreen({ onSelectProject, onNewProject }: Props) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [renameText, setRenameText] = useState("");
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    const loaded = await getAllProjects();
    if (montado.current) setProjects(loaded);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const excluir = (project: Project) => {
    Alert.alert(
      "Excluir projeto",
      `Excluir "${project.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteProject(project.id);
            await carregar();
          },
        },
      ],
    );
  };

  const duplicar = async (project: Project) => {
    await duplicateProject(project.id, `${project.name} (cópia)`);
    await carregar();
  };

  const confirmarRenome = async () => {
    if (!renaming || !renameText.trim()) return;
    await saveProject({
      ...renaming,
      name: renameText.trim(),
      updatedAt: new Date().toISOString(),
    });
    setRenaming(null);
    await carregar();
  };

  const criarDeTemplate = async (templateId: string) => {
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
      background: DEFAULT_BACKGROUND,
      disclosure: DEFAULT_DISCLOSURE,
      timelineMode: tpl.timelineMode,
      events: tpl.events.map((e) => ({ ...e, id: `evt-${newId}-${e.id}` })),
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    await saveProject(project);
    setShowTemplates(false);
    await carregar();
    onSelectProject(project);
  };

  return (
    <Screen>
      <Header
        title="Projetos"
        subtitle={
          projects.length > 0
            ? `${projects.length} salvo${projects.length > 1 ? "s" : ""}`
            : "Cenas salvas"
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title="Nenhum projeto ainda"
          hint="Projetos guardam uma cena de notificação para você exportar como imagem ou GIF."
          action={
            <View style={styles.acoesVazio}>
              <Button label="Criar projeto" icon="plus" onPress={onNewProject} />
              <Button
                label="Usar template"
                variant="secondary"
                onPress={() => setShowTemplates(true)}
              />
            </View>
          }
        />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              onPress={() => onSelectProject(item)}
              accessibilityLabel={`Abrir ${item.name}`}
            >
              <View style={styles.cardTopo}>
                <View style={styles.cardIcone}>
                  <Icon name="folder" size={20} color={colors.primary} />
                </View>
                <View style={styles.cardCorpo}>
                  <Text style={styles.cardNome} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.events.length}{" "}
                    {item.events.length === 1 ? "evento" : "eventos"} ·{" "}
                    {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
              </View>
              <View style={styles.cardAcoes}>
                <AcaoCard
                  label="Renomear"
                  onPress={() => {
                    setRenaming(item);
                    setRenameText(item.name);
                  }}
                />
                <AcaoCard label="Duplicar" onPress={() => duplicar(item)} />
                <AcaoCard
                  label="Excluir"
                  destrutivo
                  onPress={() => excluir(item)}
                />
              </View>
            </Card>
          )}
        />
      )}

      {projects.length > 0 && (
        <View style={styles.rodape}>
          <Button
            label="Novo projeto"
            icon="plus"
            onPress={onNewProject}
            style={{ flex: 1 }}
          />
          <Button
            label="Template"
            variant="secondary"
            onPress={() => setShowTemplates(true)}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {/* Renomear */}
      <Modal visible={renaming !== null} animationType="fade" transparent>
        <View style={styles.modalFundo}>
          <View style={styles.dialogo}>
            <Text style={styles.dialogoTitulo}>Renomear projeto</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.dialogoAcoes}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setRenaming(null)}
                style={{ flex: 1 }}
              />
              <Button
                label="Salvar"
                onPress={confirmarRenome}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Templates */}
      <Modal visible={showTemplates} animationType="slide" transparent>
        <View style={styles.modalFundoBaixo}>
          <View
            style={[
              styles.folha,
              { paddingBottom: spacing.xl + insets.bottom },
            ]}
          >
            <View style={styles.puxador} />
            <Text style={styles.dialogoTitulo}>Escolha um template</Text>
            <FlatList
              data={TEMPLATES}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.md }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Card
                  onPress={() => criarDeTemplate(item.id)}
                  accessibilityLabel={`Usar template ${item.name}`}
                >
                  <Text style={styles.cardNome}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.events.length}{" "}
                    {item.events.length === 1 ? "evento" : "eventos"}
                  </Text>
                </Card>
              )}
            />
            <Button
              label="Fechar"
              variant="secondary"
              onPress={() => setShowTemplates(false)}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function AcaoCard({
  label,
  onPress,
  destrutivo,
}: {
  label: string;
  onPress: () => void;
  destrutivo?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.acaoBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.acaoTexto, destrutivo && styles.acaoDestrutiva]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  cardTopo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardIcone: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCorpo: { flex: 1 },
  cardNome: { ...typography.subtitle, fontSize: 16 },
  cardMeta: { ...typography.caption, marginTop: 2 },
  cardAcoes: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acaoBtn: { paddingVertical: spacing.xs },
  acaoTexto: { ...typography.button, fontSize: 13, color: colors.primary },
  acaoDestrutiva: { color: colors.danger },

  acoesVazio: { gap: spacing.md },
  rodape: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(42,37,69,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalFundoBaixo: {
    flex: 1,
    backgroundColor: "rgba(42,37,69,0.45)",
    justifyContent: "flex-end",
  },
  dialogo: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  dialogoTitulo: { ...typography.title },
  dialogoAcoes: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  folha: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: "82%",
  },
  puxador: {
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});
