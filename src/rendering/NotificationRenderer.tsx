import React, { useMemo } from "react";
import { View } from "react-native";
import { Canvas, Image, Skia } from "@shopify/react-native-skia";
import { drawNotification } from "./drawNotification";
import type { RenderSpec } from "./drawNotification";
import type { DisclosureConfig, PlatformStyle, SaleEvent } from "../domain/types";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

type Props = {
  event: SaleEvent;
  style: PlatformStyle;
  theme: "light" | "dark";
  disclosure: DisclosureConfig;
  canvasWidth?: number;
  canvasHeight?: number;
};

// Memoizado: evita re-renderizar (e re-rasterizar) o preview quando o editor
// muda estado nao relacionado (ex.: troca de aba, selecao de outro controle).
export const NotificationRenderer = React.memo(function NotificationRenderer({
  event,
  style,
  theme,
  disclosure,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
}: Props) {
  const image = useMemo(() => {
    const spec: RenderSpec = {
      width: canvasWidth,
      height: canvasHeight,
      event,
      style,
      theme,
      disclosure,
    };
    const surface = Skia.Surface.MakeOffscreen(canvasWidth, canvasHeight);
    if (!surface) return null;
    const canvas = surface.getCanvas();
    drawNotification(canvas, spec);
    const img = surface.makeImageSnapshot();
    surface.dispose();
    return img;
  }, [event, style, theme, disclosure, canvasWidth, canvasHeight]);

  return (
    <View style={{ width: canvasWidth, height: canvasHeight }}>
      <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
        {image && (
          <Image
            image={image}
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
          />
        )}
      </Canvas>
    </View>
  );
});
