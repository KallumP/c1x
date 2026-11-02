import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { levelSourcesApi } from "./server/plugin";

const LEVEL_SRC = fileURLToPath(new URL("../../level_src", import.meta.url));

export default defineConfig({
  plugins: [react(), levelSourcesApi(LEVEL_SRC)],
  server: { open: true },
});
