export const FPS = 30;
export const ENTRY_MS = 400;
export const EXIT_MS = 250;
export const HOLD_MS = 1000;
export const SLIDE_DISTANCE = 40;

export type CardAnim = {
  readonly opacity: number;
  readonly translateY: number;
};

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function cardAnimAtTime(
  timeMs: number,
  startMs: number,
  endMs: number,
): CardAnim {
  if (timeMs < startMs || timeMs >= endMs) {
    return { opacity: 0, translateY: 0 };
  }
  const entryPhase = clamp01((timeMs - startMs) / ENTRY_MS);
  const exitPhase = clamp01((endMs - timeMs) / EXIT_MS);
  const opacity = Math.min(entryPhase, exitPhase);
  const translateY =
    (1 - entryPhase) * -SLIDE_DISTANCE + (1 - exitPhase) * SLIDE_DISTANCE;
  return { opacity, translateY };
}
