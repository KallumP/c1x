// the level editor's api, for vite's dev server (plugin.ts) and the editor
// server in the tools exe (editorServer.ts). paths are after /api/levels:
//   GET  /                     the level sources (LevelInfo[])
//   GET  /<name>/files/<file>  a file in a level's folder (its .obj, .mtl, images; game textures are made first)
//   GET  /<name>/objects       its objects.json
//   PUT  /<name>/objects       saves its objects.json
//   GET  /<name>/cfg           its level.cfg's settings (LevelCfg)
//   PUT  /<name>/cfg           sets them
//   POST /<name>/build         builds it (BuildResult)
//   POST /<name>/boot          sets settings.cfg to boot into it
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { repoFolders } from "../builder/repoFolders";
import { buildLevel } from "./build";
import { readLevelCfg, writeLevelCfg } from "./levelCfg";
import { levelFileMakingGameTextures, listLevels, readObjects, writeObjects } from "./levels";
import { bootLevel } from "./settings";

export interface ApiResponse {
  status: number;
  type: string;
  body: string | Buffer;
}

type ReadBody = () => Promise<string>;

const FILE_TYPES: Record<string, string> = {
  ".obj": "text/plain", ".mtl": "text/plain", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".bmp": "image/bmp",
  ".gif": "image/gif", ".tif": "image/tiff", ".tiff": "image/tiff",
};

const json = (value: unknown): ApiResponse => ({ status: 200, type: "application/json", body: JSON.stringify(value) });
const NOT_FOUND: ApiResponse = { status: 404, type: "text/plain", body: "not found" };
const SAVED = json({});

function fileResponse(repo: string, name: string, file: string): ApiResponse {
  const path = levelFileMakingGameTextures(join(repo, "level_src"), repoFolders(repo).streamsDir, name, file, console.warn);
  if (!path) {
    return NOT_FOUND;
  }
  return { status: 200, type: FILE_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream", body: readFileSync(path) };
}

async function objectsResponse(root: string, name: string, method: string, readBody: ReadBody): Promise<ApiResponse> {
  if (method === "GET") {
    return { status: 200, type: "application/json", body: readObjects(root, name) };
  }
  if (method === "PUT") {
    const text = await readBody();
    JSON.parse(text); // the editor checks it fully; this only refuses a broken file
    writeObjects(root, name, text);
    return SAVED;
  }
  return NOT_FOUND;
}

// a request without a sky, camera, music or volume keeps the level's; writeLevelCfg checks them
async function saveCfg(root: string, name: string, readBody: ReadBody): Promise<ApiResponse> {
  const { turn, scale, sky, camera, music, musicVolume } = JSON.parse(await readBody());
  const saved = readLevelCfg(root, name);
  writeLevelCfg(root, name, {
    turn: Number(turn),
    scale: Number(scale),
    sky: sky ?? saved.sky,
    camera: camera ?? saved.camera,
    music: music ?? saved.music,
    musicVolume: musicVolume ?? saved.musicVolume,
  });
  return SAVED;
}

async function cfgResponse(root: string, name: string, method: string, readBody: ReadBody): Promise<ApiResponse> {
  if (method === "GET") {
    return json(readLevelCfg(root, name));
  }
  if (method === "PUT") {
    return saveCfg(root, name, readBody);
  }
  return NOT_FOUND;
}

async function actionResponse(repo: string, name: string, action: string): Promise<ApiResponse> {
  if (action === "build") {
    return json(await buildLevel(repo, name));
  }
  if (action === "boot") {
    bootLevel(repo, name);
    return SAVED;
  }
  return NOT_FOUND;
}

async function route(repo: string, method: string, parts: string[], readBody: ReadBody): Promise<ApiResponse> {
  const root = join(repo, "level_src");
  if (parts.length === 0) {
    if (method === "GET") {
      return json(listLevels(root));
    }
    return NOT_FOUND;
  }
  const [name, what, ...rest] = parts;
  if (what === "files" && method === "GET") {
    return fileResponse(repo, name, rest.join("/"));
  }
  if (rest.length > 0) {
    return NOT_FOUND;
  }
  if (what === "objects") {
    return objectsResponse(root, name, method, readBody);
  }
  if (what === "cfg") {
    return cfgResponse(root, name, method, readBody);
  }
  if (method === "POST") {
    return actionResponse(repo, name, what);
  }
  return NOT_FOUND;
}

// answers a request to the api in repo: its method, its path after /api/levels
// (with any query), and its body when it's needed; a request it can't do is a 400 saying why
export async function levelsApi(repo: string, method: string, path: string, readBody: ReadBody): Promise<ApiResponse> {
  const parts = decodeURIComponent(path.split("?")[0]).split("/").filter(Boolean);
  try {
    return await route(repo, method, parts, readBody);
  } catch (error) {
    return { status: 400, type: "text/plain", body: error instanceof Error ? error.message : String(error) };
  }
}
