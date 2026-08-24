import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { PRIVACY_POLICY, TERMS_OF_USE } from "../legal/documents";
import type { LegalDocument } from "../legal/documents";

type Props = {
  onAccept: () => void;
};

function DocumentSection({ doc }: { doc: LegalDocument }) {
  return (
    <View style={styles.docBlock}>
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
    </View>
  );
}

export function TermsScreen({ onAccept }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Bem-vindo ao NotifyStudio
        </Text>
        <Text style={styles.intro}>
          Antes de continuar, leia e aceite a Política de Privacidade e os
          Termos de Uso. O aplicativo não coleta dados: tudo fica apenas no
          seu aparelho e todo o conteúdo é simulado.
        </Text>
        <DocumentSection doc={PRIVACY_POLICY} />
        <DocumentSection doc={TERMS_OF_USE} />
      </ScrollView>

      <View style={styles.footer}>
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
            {accepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>
            Li e aceito a Política de Privacidade e os Termos de Uso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, !accepted && styles.acceptBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
          accessibilityState={{ disabled: !accepted }}
          disabled={!accepted}
          onPress={onAccept}
        >
          <Text style={styles.acceptBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700", color: "#1A1A1A" },
  intro: { fontSize: 15, color: "#555", marginTop: 12, lineHeight: 22 },
  docBlock: { marginTop: 28 },
  docTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A" },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginTop: 14,
  },
  sectionBody: { fontSize: 14, color: "#555", marginTop: 4, lineHeight: 21 },
  versionText: { fontSize: 12, color: "#999", marginTop: 10 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#5E5CE6",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#5E5CE6" },
  checkmark: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  checkLabel: { flex: 1, fontSize: 14, color: "#333", lineHeight: 19 },
  acceptBtn: {
    backgroundColor: "#5E5CE6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  acceptBtnDisabled: { opacity: 0.4 },
  acceptBtnText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
});
