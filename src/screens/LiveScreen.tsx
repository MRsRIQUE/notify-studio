import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Screen,
  Header,
  Card,
  Button,
  Chip,
  Field,
  EmptyState,
} from "../ui/components";
import { colors, radius, spacing, typography } from "../ui/theme";
import { Icon } from "../ui/Icon";
import { commissionCents, bpToPercent, type Product } from "../domain/product";
import { getAllProducts } from "../persistence/database";
import { generateEventsFromProducts, DEFAULT_RULES } from "../domain/generator";
import type { SaleEvent } from "../domain/types";
import { formatCurrency } from "../domain/currency";
import {
  requestPermissionIfNeeded,
  checkPermissionStatus,
} from "../platform/notifications";
import {
  startLiveSession,
  stopLiveSession,
  type LiveSessionHandle,
} from "../platform/liveSession";
import {
  getHandle,
  setHandle,
  normalizeHandle,
  getSelectedProductIds,
  setSelectedProductIds,
} from "../state/settings";
import { saleTitle } from "../domain/saleCopy";

type Ritmo = {
  key: string;
  label: string;
  intervalMinMs: number;
  intervalMaxMs: number;
  curve: "constant" | "growth" | "burst";
};

const RITMOS: Ritmo[] = [
  { key: "calmo", label: "Calmo", intervalMinMs: 12000, intervalMaxMs: 25000, curve: "constant" },
  { key: "normal", label: "Normal", intervalMinMs: 6000, intervalMaxMs: 14000, curve: "constant" },
  { key: "aquecendo", label: "Aquecendo", intervalMinMs: 4000, intervalMaxMs: 16000, curve: "growth" },
  { key: "viral", label: "Viral", intervalMinMs: 1500, intervalMaxMs: 5000, curve: "burst" },
];

const DURACOES = [
  { key: 60, label: "1 min" },
  { key: 300, label: "5 min" },
  { key: 900, label: "15 min" },
  { key: 1800, label: "30 min" },
];

const ATRASO_INICIAL_MS = 5000;

export function LiveScreen() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [ritmo, setRitmo] = useState<Ritmo>(RITMOS[1]!);
  const [duracaoS, setDuracaoS] = useState(300);
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [sessao, setSessao] = useState<LiveSessionHandle | null>(null);
  const [restanteS, setRestanteS] = useState(0);
  const [handle, setHandleState] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const [produtos, ok] = await Promise.all([
        getAllProducts(),
        checkPermissionStatus(),
      ]);
      if (!montado.current) return;
      setCatalog(produtos);
      setPermitido(ok);
      setHandleState(await getHandle());
      const salvos = await getSelectedProductIds();
      const validos = salvos.filter((id) => produtos.some((p) => p.id === id));
      setSelecionados(
        validos.length > 0
          ? validos
          : produtos.length > 0
            ? [produtos[0]!.id]
            : [],
      );
    })().catch(() => {
      if (montado.current) setPermitido(false);
    });
  }, []);

  // selecionados entra como string para a dependencia comparar por valor:
  // um array novo a cada render invalidaria o memo sempre.
  const chaveSelecionados = selecionados.join(",");

  const escolhidos = useMemo(
    () => catalog.filter((p) => selecionados.includes(p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog, chaveSelecionados],
  );

  // A previa e valor derivado de ritmo, duracao e catalogo. Como useMemo, e
  // recalculada no mesmo render em que a configuracao muda; como efeito com
  // setState ela custava um render extra em cascata a cada toque.
  const preview = useMemo<SaleEvent[]>(() => {
    if (escolhidos.length === 0) return [];
    return generateEventsFromProducts(
      escolhidos,
      {
        ...DEFAULT_RULES,
        durationMs: duracaoS * 1000,
        intervalMinMs: ritmo.intervalMinMs,
        intervalMaxMs: ritmo.intervalMaxMs,
        curve: ritmo.curve,
      },
      // Seed fixa por configuracao: a previa nao muda sozinha a cada render.
      duracaoS * 31 + ritmo.intervalMinMs + escolhidos.length,
    );
  }, [escolhidos, ritmo, duracaoS]);

  // Contagem regressiva enquanto a sessao esta no ar.
  useEffect(() => {
    if (!sessao) return;
    const tick = () => {
      const faltam = Math.max(0, Math.round((sessao.endsAt - Date.now()) / 1000));
      setRestanteS(faltam);
      if (faltam === 0) setSessao(null);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [sessao]);

  const totalComissao = preview.reduce(
    (acc, e) =>
      acc + commissionCents(e.amountCents, e.quantity, e.commissionBp ?? 0),
    0,
  );
  const totalBruto = preview.reduce(
    (acc, e) => acc + e.amountCents * e.quantity,
    0,
  );

  const iniciar = useCallback(async () => {
    let ok = permitido;
    if (!ok) {
      ok = await requestPermissionIfNeeded();
      setPermitido(ok);
    }
    if (!ok) {
      Alert.alert(
        "Permissão necessária",
        "Para disparar as notificações, autorize as notificações do TTS nas configurações do sistema.",
      );
      return;
    }
    try {
      const sessaoNova = await startLiveSession(
        preview,
        ATRASO_INICIAL_MS,
        handle,
      );
      setSessao(sessaoNova);
    } catch (err) {
      Alert.alert(
        "Não foi possível iniciar",
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
    }
  }, [permitido, preview, handle]);

  const alternar = useCallback((id: string) => {
    setSelecionados((atual) => {
      const novo = atual.includes(id)
        ? atual.filter((x) => x !== id)
        : [...atual, id];
      void setSelectedProductIds(novo);
      return novo;
    });
  }, []);

  const parar = useCallback(async () => {
    await stopLiveSession(sessao);
    setSessao(null);
  }, [sessao]);

  if (catalog.length === 0) {
    return (
      <Screen>
        <Header title="Ao vivo" subtitle="Simulação de vendas" />
        <EmptyState
          icon="bag"
          title="Cadastre produtos primeiro"
          hint="A simulação usa seu catálogo para gerar as vendas. Abra a aba Produtos e cadastre ao menos um item."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Ao vivo" subtitle="Simulação de vendas" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sessao ? (
          <Card style={styles.rodando}>
            <View style={styles.rodandoTopo}>
              <View style={styles.pontoVivo} />
              <Text style={styles.rodandoLabel}>NO AR</Text>
            </View>
            <Text style={styles.contador}>
              {Math.floor(restanteS / 60)}:
              {String(restanteS % 60).padStart(2, "0")}
            </Text>
            <Text style={styles.rodandoHint}>
              Saia do app e comece a gravar. As notificações continuam saindo
              mesmo com o TTS fechado.
            </Text>
            <Button
              label="Parar simulação"
              variant="danger"
              icon="pause"
              onPress={parar}
              style={{ marginTop: spacing.xl }}
            />
          </Card>
        ) : (
          <>
            <Card style={{ marginTop: spacing.xl }}>
              <Field
                label="SEU @ DO TIKTOK"
                value={handle}
                placeholder="seuperfil"
                onChangeText={(v) => {
                  const limpo = normalizeHandle(v);
                  setHandleState(limpo);
                  void setHandle(limpo);
                }}
              />
              <Text style={styles.previaTitulo}>{saleTitle(handle)}</Text>
            </Card>

            <View style={styles.secaoLinha}>
              <Text style={styles.secao}>
                Produtos na live ({escolhidos.length})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const todos =
                    escolhidos.length === catalog.length
                      ? [catalog[0]!.id]
                      : catalog.map((p) => p.id);
                  setSelecionados(todos);
                  void setSelectedProductIds(todos);
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  escolhidos.length === catalog.length
                    ? "Selecionar apenas um produto"
                    : "Selecionar todos os produtos"
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.acaoLink}>
                  {escolhidos.length === catalog.length ? "Só um" : "Todos"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dica}>
              Numa live geralmente se divulga um produto por vez. Selecione mais
              de um só se quiser alternar entre eles.
            </Text>
            <View style={styles.produtos}>
              {catalog.map((p) => {
                const on = selecionados.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.produtoItem, on && styles.produtoItemOn]}
                    onPress={() => alternar(p.id)}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={p.name}
                  >
                    <View style={[styles.marca, on && styles.marcaOn]}>
                      {on && <Icon name="check" size={13} color={colors.textOnPrimary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.produtoNome} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.produtoMeta}>
                        {formatCurrency(p.priceCents, "BRL")} ·{" "}
                        {bpToPercent(p.commissionBp)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.secao}>Ritmo das vendas</Text>
            <View style={styles.chips}>
              {RITMOS.map((r) => (
                <Chip
                  key={r.key}
                  label={r.label}
                  selected={ritmo.key === r.key}
                  onPress={() => setRitmo(r)}
                />
              ))}
            </View>

            <Text style={styles.secao}>Duração</Text>
            <View style={styles.chips}>
              {DURACOES.map((d) => (
                <Chip
                  key={d.key}
                  label={d.label}
                  selected={duracaoS === d.key}
                  onPress={() => setDuracaoS(d.key)}
                />
              ))}
            </View>

            <Card style={{ marginTop: spacing.xxl }}>
              <Text style={styles.resumoTitulo}>Prévia da simulação</Text>
              <View style={styles.linha}>
                <Text style={styles.linhaLabel}>Notificações</Text>
                <Text style={styles.linhaValor}>{preview.length}</Text>
              </View>
              <View style={styles.linha}>
                <Text style={styles.linhaLabel}>Faturamento simulado</Text>
                <Text style={styles.linhaValor}>
                  {formatCurrency(totalBruto, "BRL")}
                </Text>
              </View>
              <View style={styles.linha}>
                <Text style={styles.linhaLabel}>Sua comissão</Text>
                <Text style={[styles.linhaValor, styles.destaque]}>
                  {formatCurrency(totalComissao, "BRL")}
                </Text>
              </View>
            </Card>

            <View style={styles.aviso}>
              <Icon name="check" size={16} color={colors.success} />
              <Text style={styles.avisoTexto}>
                Conteúdo simulado. Nenhuma venda real é representada.
              </Text>
            </View>

            <Button
              label="Iniciar simulação"
              icon="play"
              onPress={iniciar}
              disabled={preview.length === 0}
              style={{ marginTop: spacing.xl }}
            />
            <Text style={styles.rodapeHint}>
              A primeira notificação sai {ATRASO_INICIAL_MS / 1000}s depois de
              iniciar, para você trocar de app.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  secao: { ...typography.label, marginTop: spacing.xl, marginBottom: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  secaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  acaoLink: { ...typography.button, fontSize: 13, color: colors.primary },
  dica: { ...typography.caption, marginBottom: spacing.md, lineHeight: 18 },
  produtos: { gap: spacing.sm },
  produtoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  produtoItemOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  marca: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  marcaOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  produtoNome: { ...typography.body, fontSize: 14, fontWeight: "600" },
  produtoMeta: { ...typography.caption, fontSize: 12, marginTop: 1 },

  resumoTitulo: { ...typography.subtitle, marginBottom: spacing.md },
  previaTitulo: {
    ...typography.caption,
    marginTop: spacing.md,
    color: colors.primary,
    fontStyle: "italic",
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  linhaLabel: { ...typography.caption },
  linhaValor: { ...typography.subtitle, fontSize: 15 },
  destaque: { color: colors.success },

  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  avisoTexto: { ...typography.caption, color: colors.text, flexShrink: 1 },

  rodapeHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.md,
  },

  rodando: { marginTop: spacing.xl, alignItems: "center" },
  rodandoTopo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pontoVivo: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  rodandoLabel: { ...typography.label, color: colors.danger, letterSpacing: 1 },
  contador: {
    ...typography.display,
    fontSize: 48,
    marginTop: spacing.md,
    color: colors.primary,
  },
  rodandoHint: {
    ...typography.caption,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
