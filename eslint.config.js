// https://docs.expo.dev/guides/using-eslint/
//
// O package.json declara "type": "module", entao este arquivo e ESM: com
// `require` o ESLint quebrava no carregamento da config e o lint nunca rodava.
// A extensao em "flat.js" e obrigatoria: em ESM o Node nao resolve diretorio.
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*"],
  },
]);
