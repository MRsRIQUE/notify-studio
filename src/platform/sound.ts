import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { generateToneWav } from "../domain/tone";

export const SOUND_PRESETS = {
  chime: { label: "Toque", freq: 880, durationMs: 180 },
  cash: { label: "Caixa", freq: 1318, durationMs: 160 },
  ding: { label: "Sino", freq: 659, durationMs: 220 },
} as const;

export type SoundPresetId = keyof typeof SOUND_PRESETS;

let player: AudioPlayer | null = null;

export async function playDemoSound(soundId?: string): Promise<void> {
  const preset = SOUND_PRESETS[soundId as SoundPresetId];
  if (!preset) return;

  const wav = generateToneWav(preset.freq, preset.durationMs);
  const file = new File(Paths.cache, `ns-tone-${soundId}.wav`);
  file.write(wav);

  if (!player) {
    player = createAudioPlayer({ uri: file.uri });
  } else {
    player.replace({ uri: file.uri });
  }
  await player.seekTo(0);
  player.play();
}
