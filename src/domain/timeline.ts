import { FPS, ENTRY_MS, HOLD_MS, cardAnimAtTime, type CardAnim } from "./animation";
import type { SaleEvent } from "./types";

export type EventAnim = {
  readonly event: SaleEvent;
  readonly anim: CardAnim;
};

export function eventWindowEnd(
  events: readonly SaleEvent[],
  index: number,
): number {
  const next = events[index + 1];
  if (next) return next.timeMs + ENTRY_MS;
  const current = events[index];
  return current.timeMs + ENTRY_MS + HOLD_MS;
}

export function videoDurationMs(events: readonly SaleEvent[]): number {
  if (events.length === 0) return 0;
  const last = events[events.length - 1]!;
  return last.timeMs + ENTRY_MS + HOLD_MS;
}

export function frameCount(
  events: readonly SaleEvent[],
  fps: number = FPS,
): number {
  return Math.max(0, Math.ceil((videoDurationMs(events) / 1000) * fps));
}

export function frameTimeMs(frameIndex: number, fps: number = FPS): number {
  return (frameIndex * 1000) / fps;
}

export function activeEventAnims(
  events: readonly SaleEvent[],
  timeMs: number,
): EventAnim[] {
  return events
    .map((event, i) => ({
      event,
      anim: cardAnimAtTime(timeMs, event.timeMs, eventWindowEnd(events, i)),
    }))
    .filter((a) => a.anim.opacity > 0);
}
