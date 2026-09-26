import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
await build({
  absWorkingDir: here,
  entryPoints: ["preview.ts"],
  outfile: "preview.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2022",
  alias: { obsidian: fileURLToPath(new URL("./obsidian.ts", import.meta.url)) },
  logLevel: "info",
});
