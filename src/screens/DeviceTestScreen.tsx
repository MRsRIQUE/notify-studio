import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
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
    setStatus("Notificacao cancelada.");
  };

  const handleCancelAll = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setSentIds([]);
    await saveSentIds([]);
    setStatus("Todas as notificacoes canceladas.");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
    >
      <View style={styles.topBar}>
      <TouchableOpacity
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Text style={styles.backBtn}>Voltar</Text>
      </TouchableOpacity>
        <Text style={styles.title}>Teste no aparelho</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Como funciona?</Text>
        <Text style={styles.infoBody}>
          Esta funcionalidade dispara notificacoes reais no seu aparelho. A
          aparencia final depende do sistema operacional, tema e configuracoes
          do usuario. Nao e possivel garantir fidelidade visual exata.
        </Text>
      </View>

      {permissionGranted === false && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Permissao necessaria. Conceda acesso a notificacoes nas
            configuracoes do sistema.
          </Text>
        </View>
      )}

      {permissionGranted === null && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.primaryBtn}
          onPress={handleRequestPermission}
        >
          <Text style={styles.primaryText}>Solicitar permissao</Text>
        </TouchableOpacity>
      )}

      {permissionGranted === true && (
        <>
          <TouchableOpacity
          accessibilityRole="button"
            style={styles.primaryBtn}
            onPress={handleFireImmediate}
          >
            <Text style={styles.primaryText}>
              Disparar notificacao imediata
            </Text>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sentToday}</Text>
              <Text style={styles.statLabel}>Enviadas hoje</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{sentIds.length}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
          </View>

          {sentIds.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Notificacoes pendentes
              </Text>
              {sentIds.map((id) => (
                <View key={id} style={styles.notifItem}>
                  <Text style={styles.notifId} numberOfLines={1}>
                    {id}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCancelOne(id)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar notificação agendada"
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
          accessibilityRole="button"
                style={styles.cancelAllBtn}
                onPress={handleCancelAll}
              >
                <Text style={styles.cancelAllText}>Cancelar todas</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {status && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      <View style={styles.limitsCard}>
        <Text style={styles.limitsTitle}>Limites</Text>
        <Text style={styles.limitsText}>
          Maximo {MAX_DAILY} testes por dia
        </Text>
        <Text style={styles.limitsText}>
          Maximo {MAX_PENDING} notificacoes pendentes
        </Text>
        <Text style={styles.limitsText}>Sem recorrencia infinita</Text>
        <Text style={styles.limitsText}>
          Cancelamento sempre disponivel
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 16,
  },
  backBtn: { fontSize: 16, color: "#5E5CE6" },
  title: { fontSize: 18, fontWeight: "700" },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  infoTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  infoBody: { fontSize: 14, color: "#555", lineHeight: 20 },
  warningCard: {
    backgroundColor: "#FFF3CD",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  warningText: { fontSize: 14, color: "#856404" },
  primaryBtn: {
    backgroundColor: "#1A1A1A",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  stat: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  notifItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  notifId: { fontSize: 12, color: "#888", flex: 1, marginRight: 8 },
  cancelText: { color: "#E53935", fontSize: 13 },
  cancelAllBtn: {
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelAllText: { color: "#E53935", fontSize: 14, fontWeight: "600" },
  statusBar: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  statusText: { fontSize: 14, color: "#333" },
  limitsCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 40,
  },
  limitsTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  limitsText: { fontSize: 13, color: "#666", marginBottom: 4 },
});
