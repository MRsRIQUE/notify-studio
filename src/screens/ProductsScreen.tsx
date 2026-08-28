import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Screen,
  Header,
  Card,
  Button,
  Field,
  EmptyState,
} from "../ui/components";
import { Icon } from "../ui/Icon";
import { colors, radius, spacing, typography } from "../ui/theme";
import type { Product } from "../domain/product";
import { bpToPercent, isValidProduct, percentToBp } from "../domain/product";
import { formatCurrency } from "../domain/currency";
import {
  getAllProducts,
  saveProduct,
  deleteProduct,
} from "../persistence/database";
import { pickProductPhoto, deleteProductPhoto } from "../platform/productPhoto";

type Draft = {
  id: string;
  name: string;
  priceText: string;
  commissionText: string;
  photoUri?: string;
  createdAt: string;
};

function newId(): string {
  return `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Aceita "89,90" e "89.90"; devolve centavos.
function parsePriceToCents(text: string): number {
  const normalizado = text.replace(/\s/g, "").replace(",", ".");
  const valor = Number.parseFloat(normalizado);
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.round(valor * 100);
}

function centsToPriceText(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function emptyDraft(): Draft {
  return {
    id: newId(),
    name: "",
    priceText: "",
    commissionText: "15",
    createdAt: new Date().toISOString(),
  };
}

function draftFrom(product: Product): Draft {
  return {
    id: product.id,
    name: product.name,
    priceText: centsToPriceText(product.priceCents),
    commissionText: String(bpToPercent(product.commissionBp)),
    photoUri: product.photoUri,
    createdAt: product.createdAt,
  };
}

export function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const all = await getAllProducts();
    if (montado.current) setProducts(all);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const escolherFoto = useCallback(async () => {
    if (!draft) return;
    try {
      const uri = await pickProductPhoto(draft.id);
      if (uri && montado.current) {
        setDraft((d) => (d ? { ...d, photoUri: uri } : d));
      }
    } catch (err) {
      Alert.alert(
        "Não foi possível abrir a galeria",
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
    }
  }, [draft]);

  const salvar = useCallback(async () => {
    if (!draft) return;
    const product: Product = {
      id: draft.id,
      name: draft.name.trim(),
      priceCents: parsePriceToCents(draft.priceText),
      commissionBp: percentToBp(Number.parseFloat(draft.commissionText) || 0),
      photoUri: draft.photoUri,
      createdAt: draft.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (!isValidProduct(product)) {
      Alert.alert(
        "Dados incompletos",
        "Informe ao menos um nome e um preço válido para o produto.",
      );
      return;
    }

    await saveProduct(product);
    setDraft(null);
    await load();
  }, [draft, load]);

  const excluir = useCallback(
    (product: Product) => {
      Alert.alert(
        "Excluir produto",
        `Excluir "${product.name}"? As simulações já criadas continuam válidas — elas guardam uma cópia dos dados.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: async () => {
              await deleteProduct(product.id);
              deleteProductPhoto(product.photoUri);
              await load();
            },
          },
        ],
      );
    },
    [load],
  );

  const editando = draft !== null && products.some((p) => p.id === draft.id);

  return (
    <Screen>
      <Header
        title="Produtos"
        subtitle={
          products.length > 0
            ? `${products.length} no catálogo`
            : "Seu catálogo"
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon="bag"
          title="Nenhum produto ainda"
          hint="Cadastre produtos com preço e comissão. As vendas simuladas são geradas a partir deles."
          action={
            <Button
              label="Adicionar produto"
              icon="plus"
              onPress={() => setDraft(emptyDraft())}
            />
          }
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() => setDraft(draftFrom(item))}
              accessibilityLabel={`Editar ${item.name}`}
            >
              {item.photoUri ? (
                <Image source={{ uri: item.photoUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbVazio]}>
                  <Icon name="bag" size={22} color={colors.primary} />
                </View>
              )}
              <View style={styles.cardCorpo}>
                <Text style={styles.cardNome} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.cardMetaLinha}>
                  <Text style={styles.cardPreco}>
                    {formatCurrency(item.priceCents, "BRL")}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeTexto}>
                      {bpToPercent(item.commissionBp)}%
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => excluir(item)}
                accessibilityRole="button"
                accessibilityLabel={`Excluir ${item.name}`}
                style={styles.excluirBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="trash" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      {products.length > 0 && (
        <View style={styles.rodape}>
          <Button
            label="Adicionar produto"
            icon="plus"
            onPress={() => setDraft(emptyDraft())}
          />
        </View>
      )}

      <Modal visible={draft !== null} animationType="slide" transparent>
        <View style={styles.modalFundo}>
          <View
            style={[styles.modalCard, { paddingBottom: spacing.xl + insets.bottom }]}
          >
            <View style={styles.puxador} />
            <Text style={styles.modalTitulo}>
              {editando ? "Editar produto" : "Novo produto"}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.fotoPicker}
                onPress={escolherFoto}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto do produto"
              >
                {draft?.photoUri ? (
                  <Image
                    source={{ uri: draft.photoUri }}
                    style={styles.fotoPreview}
                  />
                ) : (
                  <>
                    <Icon name="plus" size={24} color={colors.primary} />
                    <Text style={styles.fotoTexto}>Foto do produto</Text>
                  </>
                )}
              </TouchableOpacity>

              <Field
                label="NOME DO PRODUTO"
                value={draft?.name ?? ""}
                placeholder="Ex: Fone Bluetooth TWS"
                onChangeText={(v) =>
                  setDraft((d) => (d ? { ...d, name: v } : d))
                }
              />
              <Field
                label="PREÇO (R$)"
                value={draft?.priceText ?? ""}
                placeholder="89,90"
                keyboardType="decimal-pad"
                onChangeText={(v) =>
                  setDraft((d) => (d ? { ...d, priceText: v } : d))
                }
              />
              <Field
                label="SUA COMISSÃO (%)"
                value={draft?.commissionText ?? ""}
                placeholder="15"
                keyboardType="decimal-pad"
                onChangeText={(v) =>
                  setDraft((d) => (d ? { ...d, commissionText: v } : d))
                }
              />

              <View style={styles.modalAcoes}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => setDraft(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Salvar"
                  icon="check"
                  onPress={salvar}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  thumbVazio: { alignItems: "center", justifyContent: "center" },
  cardCorpo: { flex: 1 },
  cardNome: { ...typography.subtitle, fontSize: 15 },
  cardMetaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cardPreco: { ...typography.body, fontSize: 14, color: colors.textMuted },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  badgeTexto: {
    ...typography.label,
    fontSize: 11,
    color: colors.success,
  },
  excluirBtn: { padding: spacing.sm },

  rodape: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(42,37,69,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: "88%",
  },
  puxador: {
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  modalTitulo: { ...typography.title, marginBottom: spacing.md },
  fotoPicker: {
    height: 132,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    gap: spacing.sm,
  },
  fotoTexto: { ...typography.button, color: colors.primary },
  fotoPreview: { width: "100%", height: "100%" },
  modalAcoes: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
});
