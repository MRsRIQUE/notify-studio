import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button, Screen } from "../ui/components";
import { Icon, type IconName } from "../ui/Icon";
import { colors, radius, spacing, typography } from "../ui/theme";

type Props = {
  onComplete: () => void;
};

type Step = {
  icon: IconName;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: "bag",
    title: "Cadastre seus produtos",
    body: "Informe o preço e a comissão de cada item. O TTS calcula sozinho o faturamento da live e quanto você ganha em cada venda.",
  },
  {
    icon: "live",
    title: "Monte a sua live",
    body: "Escolha quais produtos entram, o ritmo das vendas e a duração. A sequência inteira é agendada antes de começar.",
  },
  {
    icon: "check",
    title: "Notificações reais, vendas simuladas",
    body: "As notificações saem de verdade no seu aparelho, mesmo com o app fechado. O conteúdo é sempre simulado — nenhuma venda real é representada.",
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = React.useState(0);
  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <Screen edges="both" style={styles.screen}>
      <View style={styles.dots} accessibilityRole="progressbar">
        {STEPS.map((s, i) => (
          <View
            key={s.title}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.iconBubble}>
          <Icon name={current.icon} size={44} color={colors.primary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {current.title}
        </Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      <View style={styles.footer}>
        {step > 0 && (
          <Button
            label="Voltar"
            variant="secondary"
            onPress={() => setStep((s) => s - 1)}
            style={styles.btnBack}
          />
        )}
        <Button
          label={isLast ? "Começar" : "Próximo"}
          onPress={() => (isLast ? onComplete() : setStep((s) => s + 1))}
          style={styles.btnNext}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.xl },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  // O passo atual vira uma barra, nao so um ponto mais escuro: a posicao fica
  // legivel de relance mesmo para quem nao distingue bem as duas cores.
  dotActive: { width: 26, backgroundColor: colors.primary },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  iconBubble: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { ...typography.display, textAlign: "center" },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 340,
  },

  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  btnBack: { flexShrink: 1 },
  btnNext: { flexGrow: 1, flexShrink: 1 },
});
