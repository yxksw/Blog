import { vitePreprocess } from "@astrojs/svelte";

export default {
  preprocess: [vitePreprocess({ script: true })],
  compilerOptions: {
    runes: false,
    compatibility: {
      componentApi: 4,
    },
  },
};
