// the editor's apis (apis.ts) on vite's dev server
import { dirname } from "node:path";
import type { Plugin } from "vite";
import { APIS } from "./apis";
import { requestBody, sendApiResponse } from "./http";

// root is level_src/, in the repo
export function levelSourcesApi(root: string): Plugin {
  const repo = dirname(root);
  return {
    name: "level-sources-api",
    configureServer(server) {
      for (const [path, api] of APIS) {
        server.middlewares.use(path, async (req, res) => {
          const readBody = () => requestBody(req);
          const answer = await api(repo, req.method ?? "GET", req.url ?? "/", readBody);
          sendApiResponse(res, answer);
        });
      }
    },
  };
}
