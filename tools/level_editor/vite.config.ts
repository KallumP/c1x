import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { levelSourcesApi } from "./server/plugin";

const LEVEL_SRC = fileURLToPath(new URL("../../level_src", import.meta.url));
// vite build puts the page here, for the tools exe to serve (builder/repoFolders.ts)
const PAGE_DIR = fileURLToPath(new URL("../../build/editor", import.meta.url));

export default defineConfig({
  plugins: [react(), levelSourcesApi(LEVEL_SRC)],
  server: { open: true },
  // one big script is fine for a page served from the player's own machine
  build: { outDir: PAGE_DIR, emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
