import type { SkCanvas } from "@shopify/react-native-skia";
import type { Project } from "../domain/types";
import { activeEventAnims } from "../domain/timeline";
import { drawBackground, drawNotificationCard } from "./drawNotification";

export type FrameSpec = {
  width: number;
  height: number;
  project: Project;
};

export function composeFrame(
  canvas: SkCanvas,
  spec: FrameSpec,
  timeMs: number,
): void {
  const { width, height, project } = spec;
  const base = {
    width,
    height,
    style: project.platformStyle,
    theme: project.theme,
    disclosure: project.disclosure,
    background: project.background,
  };
  drawBackground(canvas, base);
  const anims = activeEventAnims(project.events, timeMs);
  for (const { event, anim } of anims) {
    drawNotificationCard(canvas, { ...base, event }, anim);
  }
}
