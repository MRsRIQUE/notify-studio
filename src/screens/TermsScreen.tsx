import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PRIVACY_POLICY, TERMS_OF_USE } from "../legal/documents";
import type { LegalDocument } from "../legal/documents";
import { Button, Card, Screen } from "../ui/components";
import { Icon } from "../ui/Icon";
import { colors, radius, spacing, typography } from "../ui/theme";

type Props = {
  onAccept: () => void;
};

function DocumentSection({ doc }: { doc: LegalDocument }) {
  return (
    <Card style={styles.docCard}>
      <Text style={styles.docTitle} accessibilityRole="header">
        {doc.title}
      </Text>
      {doc.sections.map((section) => (
        <View key={section.heading}>
          <Text style={styles.sectionHeading} accessibilityRole="header">
            {section.heading}
          </Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
      <Text style={styles.versionText}>
        Versão {doc.version} · atualizado em {doc.updatedAt}
      </Text>
    </Card>
  );
}

export function TermsScreen({ onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);
  // App em edge-to-edge: o Screen cuida do topo, mas o rodape flutua sobre o
  // ScrollView e precisa do inset proprio — sem ele o botao de aceite fica sob
  // a barra de gestos, impossivel de tocar.
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Bem-vindo ao TTS
        </Text>
        <Text style={styles.intro}>
          Antes de continuar, leia e aceite a Política de Privacidade e os
          Termos de Uso. O aplicativo não coleta dados: tudo fica apenas no seu
          aparelho e todo o conteúdo é simulado.
        </Text>
        <DocumentSection doc={PRIVACY_POLICY} />
        <DocumentSection doc={TERMS_OF_USE} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.xl + insets.bottom }]}>
        <TouchableOpacity
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="Aceito a Política de Privacidade e os Termos de Uso"
          onPress={() => setAccepted((v) => !v)}
        >
          <View
            style={[styles.checkbox, accepted && styles.checkboxChecked]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {accepted && (
              <Icon name="check" size={16} color={colors.textOnPrimary} />
            )}
          </View>
          <Text style={styles.checkLabel}>
            Li e aceito a Política de Privacidade e os Termos de Uso
          </Text>
        </TouchableOpacity>
        <Button
          label="Continuar"
          onPress={onAccept}
          disabled={!accepted}
          style={styles.acceptBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  title: { ...typography.display },
  intro: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 22,
  },

  docCard: { marginTop: spacing.xl, gap: spacing.xs },
  docTitle: { ...typography.title },
  sectionHeading: { ...typography.subtitle, fontSize: 15, marginTop: spacing.md },
  sectionBody: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 21,
  },
  versionText: { ...typography.label, marginTop: spacing.md },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkLabel: {
    ...typography.body,
    fontSize: 14,
    flex: 1,
    lineHeight: 19,
  },
  acceptBtn: { marginTop: spacing.lg },
});
