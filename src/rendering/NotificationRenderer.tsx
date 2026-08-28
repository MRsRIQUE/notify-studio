import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { View } from "react-native";
import { Canvas, Picture, Skia } from "@shopify/react-native-skia";
import { drawBackground, drawNotificationCard } from "./drawNotification";
import type { RenderSpec, VisualSpec } from "./drawNotification";
import type {
  BackgroundConfig,
  DisclosureConfig,
  PlatformStyle,
  SaleEvent,
} from "../domain/types";
import { cardAnimAtTime, ENTRY_MS, EXIT_MS, HOLD_MS } from "../domain/animation";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

type Props = {
  event: SaleEvent;
  style: PlatformStyle;
  theme: "light" | "dark";
  disclosure: DisclosureConfig;
  background?: BackgroundConfig;
  canvasWidth?: number;
  canvasHeight?: number;
  playing?: boolean;
  onAnimationComplete?: () => void;
};

function getAnimDuration(event: SaleEvent): number {
  return ENTRY_MS + HOLD_MS + EXIT_MS;
}

export const NotificationRenderer = React.memo(function NotificationRenderer({
  event,
  style,
  theme,
  disclosure,
  background,
  canvasWidth = CANVAS_WIDTH,
  canvasHeight = CANVAS_HEIGHT,
  playing = false,
  onAnimationComplete,
}: Props) {
  const [animTime, setAnimTime] = useState(0);
  const animRef = useRef(animTime);
  animRef.current = animTime;
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const eventStartRef = useRef(event.timeMs);

  const spec = useMemo<VisualSpec>(() => ({
    width: canvasWidth,
    height: canvasHeight,
    style,
    theme,
    disclosure,
    background,
  }), [canvasWidth, canvasHeight, style, theme, disclosure, background]);

  const renderSpec = useMemo<RenderSpec>(() => ({
    ...spec,
    event,
  }), [spec, event]);

  const triggerAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = Date.now();
    eventStartRef.current = event.timeMs;
    setAnimTime(0);

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const duration = getAnimDuration(event);

      if (elapsed >= duration) {
        setAnimTime(duration);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        onAnimationComplete?.();
        return;
      }

      setAnimTime(elapsed);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [event, onAnimationComplete]);

  useEffect(() => {
    triggerAnimation();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [triggerAnimation, playing]);

  const anim = useMemo(() => {
    const startMs = eventStartRef.current;
    const endMs = startMs + ENTRY_MS + HOLD_MS;
    return cardAnimAtTime(animRef.current, startMs, endMs);
  }, [animTime, event.id]);

  // Grava os comandos de desenho num SkPicture (CPU) em vez de rasterizar numa
  // superficie offscreen. MakeOffscreen exige contexto de GPU e retornava null
  // em aparelhos como o moto g04s (Mali/Unisoc), deixando o preview em branco
  // sem nenhum erro - falha silenciosa. O Picture nao depende de GPU.
  const picture = useMemo(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(
      Skia.XYWHRect(0, 0, canvasWidth, canvasHeight),
    );
    drawBackground(canvas, spec);
    drawNotificationCard(canvas, renderSpec, anim);
    return recorder.finishRecordingAsPicture();
  }, [canvasWidth, canvasHeight, spec, renderSpec, anim]);

  return (
    <View style={{ width: canvasWidth, height: canvasHeight }}>
      <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
});
