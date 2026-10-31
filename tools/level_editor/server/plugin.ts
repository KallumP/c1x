// the editor's api, served by vite's dev server:
//   GET /api/levels                     the level sources (LevelInfo[])
//   GET /api/levels/<name>/files/<file> a file in a level's folder (its .obj, .mtl, images)
//   GET /api/levels/<name>/objects      its objects.json
//   PUT /api/levels/<name>/objects      saves its objects.json
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { levelFilePath, listLevels, readObjects, writeObjects } from "./levels";

const TYPES: Record<string, string> = {
  ".obj": "text/plain", ".mtl": "text/plain", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".bmp": "image/bmp",
  ".gif": "image/gif", ".tif": "image/tiff", ".tiff": "image/tiff",
};

function send(res: ServerResponse, status: number, type: string, body: string | Buffer) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    let text = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { text += chunk; });
    req.on("end", () => ok(text));
    req.on("error", fail);
  });
}

export function levelSourcesApi(root: string): Plugin {
  return {
    name: "level-sources-api",
    configureServer(server) {
      server.middlewares.use("/api/levels", async (req, res) => {
        try {
          const parts = decodeURIComponent((req.url ?? "/").split("?")[0]).split("/").filter(Boolean);
          if (parts.length === 0 && req.method === "GET")
            return send(res, 200, "application/json", JSON.stringify(listLevels(root)));
          const [name, what, ...rest] = parts;
          if (what === "files" && req.method === "GET") {
            const path = levelFilePath(root, name, rest.join("/"));
            if (!path) return send(res, 404, "text/plain", "not found");
            return send(res, 200, TYPES[extname(path).toLowerCase()] ?? "application/octet-stream", readFileSync(path));
          }
          if (what === "objects" && rest.length === 0) {
            if (req.method === "GET") return send(res, 200, "application/json", readObjects(root, name));
            if (req.method === "PUT") {
              const text = await body(req);
              JSON.parse(text); // the editor checks it fully; this only refuses a broken file
              writeObjects(root, name, text);
              return send(res, 200, "application/json", "{}");
            }
          }
          send(res, 404, "text/plain", "not found");
        } catch (e) {
          send(res, 400, "text/plain", e instanceof Error ? e.message : String(e));
        }
      });
    },
  };
}
