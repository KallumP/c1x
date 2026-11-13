// the editor's api, served by vite's dev server:
//   GET /api/levels                     the level sources (LevelInfo[])
//   GET /api/levels/<name>/files/<file> a file in a level's folder (its .obj, .mtl, images)
//   GET /api/levels/<name>/objects      its objects.json
//   PUT /api/levels/<name>/objects      saves its objects.json
//   GET /api/levels/<name>/cfg          its level.cfg's turn and scale (LevelCfg)
//   PUT /api/levels/<name>/cfg          sets them
//   POST /api/levels/<name>/build       builds it (BuildResult)
//   POST /api/levels/<name>/boot        sets settings.cfg to boot into it
import { readFileSync } from "node:fs";
import { dirname, extname } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { buildLevel } from "./build";
import { readLevelCfg, writeLevelCfg } from "./levelCfg";
import { levelFilePath, listLevels, readObjects, writeObjects } from "./levels";
import { bootLevel } from "./settings";

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

// root is level_src/, in the repo
export function levelSourcesApi(root: string): Plugin {
  const repo = dirname(root);
  return {
    name: "level-sources-api",
    configureServer(server) {
      server.middlewares.use("/api/levels", async (req, res) => {
        try {
          const parts = decodeURIComponent((req.url ?? "/").split("?")[0]).split("/").filter(Boolean);
          if (parts.length === 0 && req.method === "GET") {
            return send(res, 200, "application/json", JSON.stringify(listLevels(root)));
          }
          const [name, what, ...rest] = parts;
          if (what === "files" && req.method === "GET") {
            const path = levelFilePath(root, name, rest.join("/"));
            if (!path) {
              return send(res, 404, "text/plain", "not found");
            }
            return send(res, 200, TYPES[extname(path).toLowerCase()] ?? "application/octet-stream", readFileSync(path));
          }
          if (what === "objects" && rest.length === 0) {
            if (req.method === "GET") {
              return send(res, 200, "application/json", readObjects(root, name));
            }
            if (req.method === "PUT") {
              const text = await body(req);
              JSON.parse(text); // the editor checks it fully; this only refuses a broken file
              writeObjects(root, name, text);
              return send(res, 200, "application/json", "{}");
            }
          }
          if (what === "cfg" && rest.length === 0) {
            if (req.method === "GET") {
              return send(res, 200, "application/json", JSON.stringify(readLevelCfg(root, name)));
            }
            if (req.method === "PUT") {
              const { turn, scale, sky, camera, music } = JSON.parse(await body(req));
              // which checks them; a request without a sky, camera or music keeps the level's
              const saved = readLevelCfg(root, name);
              writeLevelCfg(root, name, { turn: Number(turn), scale: Number(scale), sky: sky ?? saved.sky, camera: camera ?? saved.camera, music: music ?? saved.music });
              return send(res, 200, "application/json", "{}");
            }
          }
          if (rest.length === 0 && req.method === "POST") {
            if (what === "build") {
              return send(res, 200, "application/json", JSON.stringify(await buildLevel(repo, name)));
            }
            if (what === "boot") {
              bootLevel(repo, name);
              return send(res, 200, "application/json", "{}");
            }
          }
          send(res, 404, "text/plain", "not found");
        } catch (error) {
          send(res, 400, "text/plain", error instanceof Error ? error.message : String(error));
        }
      });
    },
  };
}
