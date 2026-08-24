import { DEFAULT_DISCLOSURE, type DisclosureConfig } from "./types";

export const DISCLOSURE_TEXT = DEFAULT_DISCLOSURE.text;

type Bounds = {
  height: number;
  barY: number;
  barHeight: number;
};

type ValidationResult = {
  ok: boolean;
  reason?: string;
};

export function validateDisclosure(
  disclosure: DisclosureConfig,
  bounds?: Bounds,
): ValidationResult {
  if (disclosure.text !== DISCLOSURE_TEXT) {
    return { ok: false, reason: "text-mismatch" };
  }
  if (disclosure.position !== "top" && disclosure.position !== "bottom") {
    return { ok: false, reason: "invalid-position" };
  }
  if (disclosure.style !== "bar" && disclosure.style !== "badge") {
    return { ok: false, reason: "invalid-style" };
  }
  if (bounds) {
    const barBottom = bounds.barY + bounds.barHeight;
    if (barBottom > bounds.height) {
      return { ok: false, reason: "outside-visible-area" };
    }
  }
  return { ok: true };
}
