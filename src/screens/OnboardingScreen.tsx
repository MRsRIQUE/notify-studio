import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type Props = {
  onComplete: () => void;
};

const STEPS = [
  {
    title: "Crie cenas demonstrativas",
    body: "Monte notificacoes de venda visuais para seus videos, anuncios e apresentacoes sem precisar receber pedidos reais.",
  },
  {
    title: "Teste notificacoes no aparelho",
    body: "Dispare notificacoes locais reais no seu proprio celular para ensaiar o momento da gravacao.",
  },
  {
    title: "Dados simulados, sempre",
    body: "Toda saida e identificada como demonstracao com dados simulados. Nenhuma venda real e simulada como verdadeira.",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = React.useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.stepIndicator}>
          {step + 1} / {STEPS.length}
        </Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity
          accessibilityRole="button"
            style={styles.backBtn}
            onPress={() => setStep((s) => s - 1)}
          >
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.nextBtn}
          onPress={() => (isLast ? onComplete() : setStep((s) => s + 1))}
        >
          <Text style={styles.nextText}>
            {isLast ? "Comecar" : "Proximo"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 400,
  },
  stepIndicator: {
    fontSize: 13,
    color: "#999",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 40,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#E8E8E8",
  },
  backText: {
    fontSize: 16,
    color: "#666",
  },
  nextBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
  },
  nextText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});
