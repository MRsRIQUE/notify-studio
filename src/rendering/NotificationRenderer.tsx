import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { View } from "react-native";
import { Canvas, Image, Skia } from "@shopify/react-native-skia";
import { drawNotification, drawBackground, drawNotificationCard } from "./drawNotification";
import type { RenderSpec, VisualSpec } from "./drawNotification";
import type { DisclosureConfig, PlatformStyle, SaleEvent } from "../domain/types";
import { cardAnimAtTime, ENTRY_MS, EXIT_MS, HOLD_MS, FPS } from "../domain/animation";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

type Props = {
  event: SaleEvent;
  style: PlatformStyle;
  theme: "light" | "dark";
  disclosure: DisclosureConfig;
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
  }), [canvasWidth, canvasHeight, style, theme, disclosure]);

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

  const image = useMemo(() => {
    const surface = Skia.Surface.MakeOffscreen(canvasWidth, canvasHeight);
    if (!surface) return null;
    const canvas = surface.getCanvas();
    drawBackground(canvas, spec);
    drawNotificationCard(canvas, renderSpec, anim);
    const img = surface.makeImageSnapshot();
    surface.dispose();
    return img;
  }, [canvasWidth, canvasHeight, spec, renderSpec, anim]);

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
