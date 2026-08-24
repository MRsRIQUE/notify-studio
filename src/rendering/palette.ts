import type { PlatformStyle } from "../domain/types";

export type Palette = {
  bg: string;
  card: string;
  title: string;
  body: string;
  time: string;
  accent: string;
  bar: string;
  barText: string;
};

export function palette(
  style: PlatformStyle,
  theme: "light" | "dark",
): Palette {
  if (theme === "dark") {
    return {
      bg: "#0B0B0F",
      card: style === "android-inspired" ? "#1E1F24" : "#26262C",
      title: "#FFFFFF",
      body: "#C9C9D1",
      time: "#8E8E99",
      accent: style === "ios-inspired" ? "#5E5CE6" : "#3DDC84",
      bar: "rgba(0,0,0,0.75)",
      barText: "#FFFFFF",
    };
  }
  return {
    bg: "#F2F2F7",
    card: style === "android-inspired" ? "#FFFFFF" : "#FFFFFFF2",
    title: "#111114",
    body: "#3C3C43",
    time: "#8E8E93",
    accent: style === "ios-inspired" ? "#5E5CE6" : "#3DDC84",
    bar: "rgba(0,0,0,0.75)",
    barText: "#FFFFFF",
  };
}
