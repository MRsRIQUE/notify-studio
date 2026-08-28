import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Project } from "../domain/types";
import { generateEvents, DEFAULT_RULES } from "../domain/generator";
import { formatCurrency } from "../domain/currency";
import {
  requestPermissionIfNeeded,
  checkPermissionStatus,
  triggerLocalNotification,
} from "../platform/notifications";
import * as Notifications from "expo-notifications";
import { Button, Card, Header, Screen } from "../ui/components";
import { colors, radius, spacing, typography } from "../ui/theme";

const MAX_DAILY = 20;
const MAX_PENDING = 48;
const STORAGE_SENT_TODAY = "notify-studio-sent-today";
const STORAGE_SENT_DATE = "notify-studio-sent-date";
const STORAGE_SENT_IDS = "notify-studio-sent-ids";

type Props = {
  project: Project;
  onBack: () => void;
};

async function loadLimits(): Promise<{
  sentToday: number;
  sentIds: string[];
}> {
  try {
    const dateStr = await AsyncStorage.getItem(STORAGE_SENT_DATE);
    const today = new Date().toDateString();
    if (dateStr !== today) {
      await AsyncStorage.setItem(STORAGE_SENT_DATE, today);
      await AsyncStorage.setItem(STORAGE_SENT_TODAY, "0");
      await AsyncStorage.removeItem(STORAGE_SENT_IDS);
      return { sentToday: 0, sentIds: [] };
    }
    const countStr = await AsyncStorage.getItem(STORAGE_SENT_TODAY);
    const idsStr = await AsyncStorage.getItem(STORAGE_SENT_IDS);
    return {
      sentToday: parseInt(countStr ?? "0") || 0,
      sentIds: idsStr ? JSON.parse(idsStr) : [],
    };
  } catch {
    return { sentToday: 0, sentIds: [] };
  }
}

async function saveSentToday(n: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_SENT_TODAY, String(n));
}

async function saveSentIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_SENT_IDS, JSON.stringify(ids));
}

export function DeviceTestScreen({ project, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );
  const [sentToday, setSentToday] = useState(0);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [granted, limits] = await Promise.all([
        checkPermissionStatus(),
        loadLimits(),
      ]);
      if (!cancelled && mountedRef.current) {
        setPermissionGranted(granted);
        setSentToday(limits.sentToday);
        setSentIds(limits.sentIds);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestPermissionIfNeeded();
    setPermissionGranted(granted);
    if (!granted) {
      setStatus("Permissao negada. Conceda nas configuracoes do sistema.");
    }
  };

  const handleFireImmediate = async () => {
    if (sentToday >= MAX_DAILY) {
      setStatus("Limite diario atingido (20 testes).");
      return;
    }
    if (sentIds.length >= MAX_PENDING) {
      setStatus("Limite de pendentes atingido (48).");
      return;
    }
    if (!permissionGranted) {
      setStatus("Solicite permissao primeiro.");
      return;
    }

    const events =
      project.events.length > 0
        ? project.events
        : generateEvents(DEFAULT_RULES, 42);
    const event = events[0]!;
    const price = formatCurrency(
      event.amountCents * event.quantity,
      event.currency,
    );

    try {
      const id = await triggerLocalNotification(
        event.title,
        `${event.quantity}x ${event.productName} — ${price}`,
      );
      const newSentToday = sentToday + 1;
      const newSentIds = [...sentIds, id];
      setSentToday(newSentToday);
      setSentIds(newSentIds);
      await Promise.all([
        saveSentToday(newSentToday),
        saveSentIds(newSentIds),
      ]);
      setStatus(
        `Notificacao enviada! (${newSentToday}/${MAX_DAILY} hoje)`,
      );
    } catch {
      setStatus("Erro ao enviar notificacao.");
    }
  };

  const handleCancelOne = async (id: string) => {
    await Notifications.cancelScheduledNotificationAsync(id);
    const newIds = sentIds.filter((i) => i !== id);
    setSentIds(newIds);
    await saveSentIds(newIds);
    setStatus("Notificação cancelada.");
  };

  const handleCancelAll = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setSentIds([]);
    await saveSentIds([]);
    setStatus("Todas as notificações canceladas.");
  };

  return (
    <Screen>
      <Header title="Teste no aparelho" onBack={onBack} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxxl + insets.bottom },
        ]}
      >
        <Card>
          <Text style={styles.infoTitle}>Como funciona?</Text>
          <Text style={styles.infoBody}>
            Esta funcionalidade dispara notificações reais no seu aparelho. A
            aparência final depende do sistema operacional, do tema e das
            configurações do usuário — não é possível garantir fidelidade
            visual exata.
          </Text>
        </Card>

        {permissionGranted === false && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              Permissão necessária. Conceda acesso às notificações nas
              configurações do sistema.
            </Text>
          </View>
        )}

        {permissionGranted === null && (
          <Button
            label="Solicitar permissão"
            onPress={handleRequestPermission}
            style={styles.action}
          />
        )}

        {permissionGranted === true && (
          <>
            <Button
              label="Disparar notificação imediata"
              icon="live"
              onPress={handleFireImmediate}
              style={styles.action}
            />

            <View style={styles.statsRow}>
              <Card style={styles.stat}>
                <Text style={styles.statValue}>{sentToday}</Text>
                <Text style={styles.statLabel}>Enviadas hoje</Text>
              </Card>
              <Card style={styles.stat}>
                <Text style={styles.statValue}>{sentIds.length}</Text>
                <Text style={styles.statLabel}>Pendentes</Text>
              </Card>
            </View>

            {sentIds.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Notificações pendentes</Text>
                {sentIds.map((id) => (
                  <View key={id} style={styles.notifItem}>
                    <Text style={styles.notifId} numberOfLines={1}>
                      {id}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleCancelOne(id)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar notificação agendada"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <Button
                  label="Cancelar todas"
                  icon="trash"
                  variant="danger"
                  onPress={handleCancelAll}
                  style={styles.action}
                />
              </>
            )}
          </>
        )}

        {status && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}

        <Card style={styles.limitsCard}>
          <Text style={styles.limitsTitle}>Limites</Text>
          <Text style={styles.limitsText}>Máximo {MAX_DAILY} testes por dia</Text>
          <Text style={styles.limitsText}>
            Máximo {MAX_PENDING} notificações pendentes
          </Text>
          <Text style={styles.limitsText}>Sem recorrência infinita</Text>
          <Text style={styles.limitsText}>Cancelamento sempre disponível</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },

  infoTitle: { ...typography.subtitle, marginBottom: spacing.sm },
  infoBody: { ...typography.body, color: colors.textMuted, lineHeight: 21 },

  warningCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  warningText: { ...typography.body, fontSize: 14, color: colors.danger },

  action: { marginTop: spacing.xs },

  statsRow: { flexDirection: "row", gap: spacing.lg },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...typography.display, color: colors.primary },
  statLabel: { ...typography.label, marginTop: spacing.xs },

  sectionTitle: {
    ...typography.label,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  notifItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  notifId: { ...typography.caption, fontSize: 12, flex: 1 },
  cancelText: { ...typography.button, fontSize: 13, color: colors.danger },

  statusBar: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statusText: { ...typography.body, fontSize: 14, color: colors.primaryDark },

  limitsCard: { backgroundColor: colors.surfaceAlt, gap: spacing.xs },
  limitsTitle: { ...typography.subtitle, fontSize: 15, marginBottom: spacing.xs },
  limitsText: { ...typography.caption },
});
