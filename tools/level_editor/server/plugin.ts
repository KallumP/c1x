// the editor's apis on vite's dev server: api.ts at /api/levels, and modioApi.ts at
// /api/modio
import { dirname } from "node:path";
import type { Plugin } from "vite";
import { levelsApi } from "./api";
import { modioApi } from "./modioApi";
import { requestBody, sendApiResponse } from "./http";

// root is level_src/, in the repo
export function levelSourcesApi(root: string): Plugin {
  const repo = dirname(root);
  return {
    name: "level-sources-api",
    configureServer(server) {
      server.middlewares.use("/api/levels", async (req, res) => {
        sendApiResponse(res, await levelsApi(repo, req.method ?? "GET", req.url ?? "/", () => requestBody(req)));
      });
      server.middlewares.use("/api/modio", async (req, res) => {
        const answer = await modioApi(repo, req.method ?? "GET", req.url ?? "/", () => requestBody(req));
        sendApiResponse(res, answer);
      });
    },
  };
}
