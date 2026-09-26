import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      obsidian: fileURLToPath(new URL("./tests/obsidian-runtime.ts", import.meta.url)),
    },
  },
});
