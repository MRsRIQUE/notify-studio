import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TabBar, type TabKey } from "../ui/components";
import { colors } from "../ui/theme";
import { LiveScreen } from "./LiveScreen";
import { ProductsScreen } from "./ProductsScreen";
import { GalleryScreen } from "./GalleryScreen";
import type { Project } from "../domain/types";

type Props = {
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
};

/**
 * Casca com as tres abas principais.
 *
 * As telas ficam montadas e apenas escondidas ao trocar de aba: manter o
 * estado (rolagem, formulario em edicao, sessao ao vivo em contagem) e mais
 * importante aqui do que economizar memoria com tres telas.
 */
export function MainTabs({ onSelectProject, onNewProject }: Props) {
  const [tab, setTab] = useState<TabKey>("live");

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Pane visible={tab === "live"}>
          <LiveScreen />
        </Pane>
        <Pane visible={tab === "products"}>
          <ProductsScreen />
        </Pane>
        <Pane visible={tab === "projects"}>
          <GalleryScreen
            onSelectProject={onSelectProject}
            onNewProject={onNewProject}
          />
        </Pane>
      </View>
      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}

function Pane({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[StyleSheet.absoluteFill, !visible && styles.hidden]}
      pointerEvents={visible ? "auto" : "none"}
      // Leitores de tela devem ignorar as abas que nao estao a mostra.
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  hidden: { opacity: 0, zIndex: -1 },
});
