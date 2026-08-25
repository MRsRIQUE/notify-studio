# Performance Report — NotifyStudio

**Data:** 2026-08-24  
**Ambiente:** Windows 11, Node 24, vitest 4.1.11

---

## 1. drawNotification — Benchmark de renderizacao

Metodologia: 30 runs por combinacao (3 estilos × 2 temas × 5 templates), com 5 warmup runs. Medicao via `performance.now()`. Mock Skia (sem GPU real).

| Estilo | mean (ms) | p95 (ms) | Budget (16.6ms) |
|--------|-----------|----------|-----------------|
| ios-inspired | 0.061 | 0.079 | OK |
| android-inspired | 0.070 | 0.106 | OK |
| generic | 0.048 | 0.051 | OK |
| **GLOBAL** | **0.060** | **0.097** | **OK** |

**Conclusao:** Todas as 30 combinacoes ficam bem abaixo do budget de 16.6ms (60fps). O overhead JS puro (paint creation, rect calculations, text layout) e ~0.06ms por frame. Em GPU real, o bottleneck sera o draw calls do Skia, nao o JS.

---

## 2. Bundle Size — expo export (Android)

| Metrica | Valor |
|---------|-------|
| Modulo | `index.ts` (1002 modules) |
| HBC (Hermes Bytecode) | 2.3 MB (2,346 KB) |
| HBC + Gzip | ~1.0 MB (1,021 KB) |
| Source (TS/TSX) | 108 KB (31 files, 3,454 lines) |

**Observacoes:**
- HBC ja inclui compressao embutida; gzip adicional reduz ~56%
- Bundle inclui React Native + Expo + Skia + Zustand + omggif
- Para reduzir: tree-shaking de expo modules nao usados, code-splitting por tela (futuro)

---

## 3. exportPng — Tempo no emulador

**Pendente:** Requer `npx expo run:android` em emulador com GPU (Pixel_Test, Android 14). O benchmark de GPU nao pode ser executado em CI/Node puro porque depende de `Skia.Surface.MakeOffscreen` real.

Medicao anterior (validacao manual): GIF 120 frames em ~4s no emulador (Pixel_Test, GPU host mode). PNG unico estimado em <500ms baseado no tempo por frame do GIF.

---

## 4. exportGif — Tempo estimado

| Metrica | Valor |
|---------|-------|
| Frames | 120 (10s × 12fps) |
| Dimensoes | 540×960 |
| Tempo no emulador | ~4s |
| Tamanho medio | ~770 KB |

---

## 5. Memoria e Launch

| Metrica | Valor |
|---------|-------|
| Telas | 5 (Gallery, Editor, Onboarding, Terms, DeviceTest) |
| Stores Zustand | 2 (editorStore, exportQueue) |
| Templates | 8 |
| Testes | 184 (125 unit + 28 integration + 31 benchmark) |

---

## 6. Proximos passos

- [ ] Medir exportPng em emulador fisico (tempo real)
- [ ] Medir tempo de cold start no Android
- [ ] Avaliar code-splitting para reduzir bundle
- [ ] Benchmark de memoria (heap usage durante GIF export)
