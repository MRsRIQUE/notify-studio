import React, { useMemo } from "react";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { colors } from "./theme";

// Icones vetoriais desenhados pelo Skia a partir de path SVG.
//
// O projeto nao tem biblioteca de icones: @expo/vector-icons exigiria
// expo-font (modulo nativo) e portanto um rebuild. Como o Skia ja esta
// compilado e expoe Path.MakeFromSVGString, da para ter icones de verdade
// sem dependencia nova — e sem cair em emoji, que destoa de "cara de app".
//
// Paths desenhados numa viewBox 24x24 e escalados para o tamanho pedido.

export type IconName =
  | "live"
  | "bag"
  | "folder"
  | "plus"
  | "back"
  | "play"
  | "pause"
  | "share"
  | "trash"
  | "check";

const PATHS: Record<IconName, string> = {
  // Ondas de transmissao saindo de um ponto central.
  live: "M12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.8 5.8a9 9 0 000 12.4M18.2 5.8a9 9 0 010 12.4",
  // Sacola de compras.
  bag: "M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 016 0v2",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  plus: "M12 5v14M5 12h14",
  back: "M15 5l-7 7 7 7",
  play: "M8 5l11 7-11 7V5z",
  pause: "M9 5v14M15 5v14",
  share: "M12 16V4M8 8l4-4 4 4M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3",
  trash: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6",
  check: "M5 13l4 4L19 7",
};

// Icones cujo traco fecha uma area que deve ser pintada (nao contornada).
const FILLED: ReadonlySet<IconName> = new Set<IconName>(["play"]);

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 24,
  color = colors.text,
  strokeWidth = 2,
}: Props) {
  const path = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(PATHS[name]);
    if (!p) return null;
    const escala = size / 24;
    if (escala !== 1) {
      p.transform(Skia.Matrix().scale(escala, escala));
    }
    return p;
  }, [name, size]);

  if (!path) return null;

  const filled = FILLED.has(name);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style={filled ? "fill" : "stroke"}
        strokeWidth={strokeWidth * (size / 24)}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}
