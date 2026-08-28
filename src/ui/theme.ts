import { Platform } from "react-native";

// Design tokens do TTS.
//
// Fonte unica de verdade para cor, raio, espacamento, sombra e tipografia.
// Telas nao devem definir cor ou raio literal — sempre consumir daqui.

/**
 * CORRECAO DE TRUNCAMENTO DE TEXTO (moto g04s e outros aparelhos Motorola).
 *
 * A Motorola substitui a fonte de sistema por "MotoRoboto", que e mais larga
 * que o Roboto padrao. Na Nova Arquitetura o Fabric mede o texto em C++ com as
 * metricas do Roboto, mas o Android desenha com o MotoRoboto: a largura medida
 * fica curta e o final da palavra e cortado no desenho ("Voltar" vira "Volta").
 * A arvore de views mostra o texto completo — o corte e so na rasterizacao.
 *
 * Declarar a familia explicitamente faz desenho e medicao usarem a mesma fonte.
 * Se um aparelho nao tiver "Roboto", o Android cai na fonte padrao sozinho.
 */
export const FONT_FAMILY = Platform.select({
  android: "Roboto",
  default: undefined,
});

export const colors = {
  primary: "#7C6BF0",
  primaryDark: "#5B4BD6",
  primaryLight: "#A99BF5",
  primarySoft: "#EEEAFE",

  gradientFrom: "#8B7BF0",
  gradientTo: "#B49CE8",

  bg: "#F5F3FF",
  surface: "#FFFFFF",
  surfaceAlt: "#FAF9FF",

  text: "#2A2545",
  textMuted: "#8A85A8",
  textOnPrimary: "#FFFFFF",

  border: "#EBE7FA",

  success: "#2FBF71",
  successSoft: "#E4F7EE",
  danger: "#F0546B",
  dangerSoft: "#FDEAED",
  warning: "#F5A623",
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

// Sombra tingida de roxo: sombra cinza sobre fundo lilas suja a cor.
export const shadow = {
  card: {
    shadowColor: "#5B4BD6",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: "#5B4BD6",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const typography = {
  display: {
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: "700" as const,
    color: colors.text,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  subtitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: "400" as const,
    color: colors.text,
  },
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: "400" as const,
    color: colors.textMuted,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textMuted,
  },
  button: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: "600" as const,
  },
} as const;
