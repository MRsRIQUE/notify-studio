import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "./Icon";
import { colors, radius, shadow, spacing, typography } from "./theme";

/* ------------------------------------------------------------------ Screen */

export function Screen({
  children,
  style,
  edges = "top",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Quais bordas recebem inset. "none" quando ha TabBar cuidando do rodape. */
  edges?: "top" | "both" | "none";
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: edges === "none" ? 0 : insets.top,
          paddingBottom: edges === "both" ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ Header */

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="back" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const inativo = disabled || loading;
  const corTexto =
    variant === "primary" || variant === "danger"
      ? colors.textOnPrimary
      : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        inativo && styles.btnDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={inativo}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inativo }}
    >
      {loading ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={corTexto} />}
          <Text style={[styles.btnText, { color: corTexto }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------- Chip */

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------- Field */

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ TabBar */

export type TabKey = "live" | "products" | "projects";

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: "live", label: "Ao vivo", icon: "live" },
  { key: "products", label: "Produtos", icon: "bag" },
  { key: "projects", label: "Projetos", icon: "folder" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: spacing.sm + insets.bottom }]}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.tabIcon, on && styles.tabIconActive]}>
              <Icon
                name={tab.icon}
                size={22}
                color={on ? colors.textOnPrimary : colors.textMuted}
              />
            </View>
            <Text style={[styles.tabLabel, on && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ Styles */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  // flexShrink:1 (nao flex:1) para o titulo nao espremer os irmaos.
  headerText: { flexShrink: 1, flexGrow: 1 },
  headerTitle: { ...typography.display, fontSize: 24 },
  headerSubtitle: { ...typography.caption, marginTop: 2 },
  headerRight: { flexShrink: 0 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  btnPrimary: { backgroundColor: colors.primary, ...shadow.raised },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhost: { backgroundColor: "transparent" },
  btnDanger: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typography.button },

  chip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { ...typography.body, fontSize: 14, color: colors.textMuted },
  chipTextSelected: { color: colors.textOnPrimary, fontWeight: "600" },

  field: { marginTop: spacing.lg },
  fieldLabel: { ...typography.label, marginBottom: spacing.sm },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: { ...typography.title, textAlign: "center" },
  emptyHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyAction: { marginTop: spacing.xxl, alignSelf: "stretch" },

  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow.raised,
  },
  tabItem: { flex: 1, alignItems: "center", gap: spacing.xs },
  tabIcon: {
    width: 46,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: { backgroundColor: colors.primary },
  tabLabel: { ...typography.label, fontSize: 11 },
  tabLabelActive: { color: colors.primary },
});
