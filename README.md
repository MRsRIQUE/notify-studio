# NotifyStudio

Aplicativo mobile para criar demonstrações visuais de notificações de vendas — tudo offline, dados simulados, com aviso obrigatório "Demonstração — dados simulados" em todos os exports.

## Stack

- React Native + Expo (SDK 57, dev build)
- TypeScript (strict)
- @shopify/react-native-skia (renderização)
- Zustand (estado)
- expo-notifications, expo-file-system, expo-sharing
- omggif (encoder GIF puro JS)

## Setup

```bash
npm install
npx expo prebuild --platform android
# Build debug APK (requer JDK 17 + Android SDK + NDK 27)
cd android && ./gradlew assembleDebug
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npx tsc --noEmit` | Typecheck |
| `npx vitest run` | Testes unitários |
| `npx expo lint` | Lint |
| `npx expo export --platform android` | Bundle JS offline |

## Arquitetura (resumida)

```
src/
  domain/        tipos, templates, generator, timeline, disclosure, contrast
  rendering/     drawNotification (Skia), gifEncoder, palette, NotificationRenderer
  platform/      exportPng, exportGif, exportAnimated, exportVideo (stub), notifications
  state/         editorStore (Zustand), exportQueue
  screens/       Gallery, Editor, Onboarding, Terms, DeviceTest
  legal/         documents (privacidade + termos), termsStore
```

## Gate de validação

- **Android (emulador)**: FECHADO — fluxo completo validado, GIF 120 frames extraído e verificado
- **Android (físico) + iOS**: PENDENTE — necessário antes de submeter as lojas
- **MP4 H.264**: BACKLOG — ffmpeg-kit removido (Arthenica discontinued), reintegração via expo-video mapeada para versão seguinte

## Status

| Fase | Status |
|------|--------|
| 0 — Spike | ✔ |
| 1 — MVP | ✔ |
| 2 — Video | ✔ |
| 3 — Lançamento | ✔ |
| 4 — Melhorias | ✔ |
