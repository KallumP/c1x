// a level downloaded from mod.io, unzipped into level_src/: the zip holds the
// level's folder (doc/custom_levels.md), which keeps a note of the mod it's from
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync, type Unzipped } from "fflate";
import { isBootableName } from "../server/settings";
import type { Answer } from "./modio";

const MODIO_NOTE = ".modio.json"; // { modId }: the mod.io level a folder was downloaded from
const MAC_FOLDER = "__MACOSX/";   // what a mac adds to a zip it makes
const PLAIN_NAME = /^[^\/:*?"<>|]+$/; // a file name that stays in its folder on any system
const NOT_ONE_FOLDER = { problem: "The zip doesn't hold one level's folder." };

// the zip's files, by their paths split at each /, without folders or a mac's extras
function zippedFiles(zip: Unzipped): [string[], Uint8Array][] {
  return Object.entries(zip)
    .filter(([path]) => !path.endsWith("/") && !path.startsWith(MAC_FOLDER))
    .map(([path, data]) => [path.split("/"), data]);
}

// the one folder all the files are in, or null if they aren't in one
function levelFolderName(files: [string[], Uint8Array][]): string | null {
  const folders = new Set(files.map(([parts]) => parts[0]));
  if (folders.size !== 1 || files.some(([parts]) => parts.length < 2)) {
    return null;
  }
  return [...folders][0];
}

const isPlainName = (name: string) => PLAIN_NAME.test(name) && name !== "." && name !== "..";

// the files right inside the level's folder, by name; deeper folders are skipped
function levelFiles(files: [string[], Uint8Array][]): Map<string, Uint8Array> {
  const direct = files.filter(([parts]) => parts.length === 2 && isPlainName(parts[1]));
  return new Map(direct.map(([parts, data]) => [parts[1], data]));
}

// the mod.io level level_src/<name> was downloaded from, if it was
function downloadedFrom(folder: string): number | null {
  const note = join(folder, MODIO_NOTE);
  if (!existsSync(note)) {
    return null;
  }
  return (JSON.parse(readFileSync(note, "utf8")) as { modId: number }).modId;
}

// why name can't be unzipped into level_src, or null if it can
function nameProblem(root: string, name: string, files: Map<string, Uint8Array>, modId: number): string | null {
  if (!isBootableName(name)) {
    return `The level's folder, ${name}, can only have letters, digits, _ and - in its name.`;
  }
  if (![...files.keys()].some((file) => file.toLowerCase().endsWith(".obj"))) {
    return `${name} has no map (a .obj) in it.`;
  }
  const folder = join(root, name);
  if (existsSync(folder) && downloadedFrom(folder) !== modId) {
    return `There's already a level called ${name}: rename its folder in level_src first.`;
  }
  return null;
}

function writeLevel(folder: string, files: Map<string, Uint8Array>, modId: number): void {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  for (const [file, data] of files) {
    writeFileSync(join(folder, file), data);
  }
  writeFileSync(join(folder, MODIO_NOTE), JSON.stringify({ modId }));
}

function unzipped(zip: Uint8Array): Unzipped | null {
  try {
    return unzipSync(zip);
  } catch {
    return null;
  }
}

// unzips the level mod modId's zip into level_src/ (root), replacing it if it was
// downloaded before; its folder's name
export function unzipLevel(root: string, zip: Uint8Array, modId: number): Answer<{ name: string }> {
  const entries = unzipped(zip);
  if (!entries) {
    return { problem: "The download isn't a zip." };
  }
  const files = zippedFiles(entries);
  const name = levelFolderName(files);
  if (name === null) {
    return NOT_ONE_FOLDER;
  }
  const level = levelFiles(files);
  const problem = nameProblem(root, name, level, modId);
  if (problem) {
    return { problem };
  }
  writeLevel(join(root, name), level, modId);
  return { name };
}
