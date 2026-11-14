// the editor's api (api.ts) on vite's dev server, at /api/levels
import { dirname } from "node:path";
import type { Plugin } from "vite";
import { levelsApi } from "./api";
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
    },
  };
}
