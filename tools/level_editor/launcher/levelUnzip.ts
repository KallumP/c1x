// a level downloaded from mod.io, unzipped into level_src/: the zip holds the
// level's folder (doc/custom_levels.md), which keeps a note of the mod it's from
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isBootableName } from "../server/settings";
import type { Answer } from "../scripts/answer";
import { isPlainName, tryUnzip, zippedFiles } from "./zipEntries";

// the file in a downloaded level's folder noting the mod.io level it's from
const MODIO_NOTE = ".modio.json";
interface ModioNote {
  modId: number;
}

// the one folder all the files are in, or null if they aren't in one
function levelFolderName(files: [string[], Uint8Array][]): string | null {
  const folders = new Set(files.map(([parts]) => parts[0]));
  if (folders.size !== 1 || files.some(([parts]) => parts.length < 2)) {
    return null;
  }
  return [...folders][0];
}

// the files right inside the level's folder, by name; deeper folders are skipped
function levelFiles(files: [string[], Uint8Array][]): Map<string, Uint8Array> {
  const direct = files.filter(([parts]) => parts.length === 2 && isPlainName(parts[1]));
  return new Map(direct.map(([parts, data]) => [parts[1], data]));
}

// the mod.io level folder was downloaded from, or null if it wasn't (or its note
// can't be read)
function downloadedFrom(folder: string): number | null {
  const note = join(folder, MODIO_NOTE);
  if (!existsSync(note)) {
    return null;
  }
  try {
    return (JSON.parse(readFileSync(note, "utf8")) as Partial<ModioNote>).modId ?? null;
  } catch {
    return null;
  }
}

function folderNameProblem(name: string): string | null {
  if (!isBootableName(name)) {
    return `The level's folder, ${name}, can only have letters, digits, _ and - in its name.`;
  }
  return null;
}

function missingMapProblem(name: string, files: Map<string, Uint8Array>): string | null {
  if (![...files.keys()].some((file) => file.toLowerCase().endsWith(".obj"))) {
    return `${name} has no map (a .obj) in it.`;
  }
  return null;
}

// a level of the player's own, or another mod.io level's, already in level_src/<name>
function existingFolderProblem(root: string, name: string, modId: number): string | null {
  const folder = join(root, name);
  if (existsSync(folder) && downloadedFrom(folder) !== modId) {
    return `There's already a level called ${name}: rename its folder in level_src first.`;
  }
  return null;
}

// why the level can't be unzipped into level_src/<name>, or null if it can
function unzipProblem(
  root: string,
  name: string,
  files: Map<string, Uint8Array>,
  modId: number,
): string | null {
  return folderNameProblem(name)
    ?? missingMapProblem(name, files)
    ?? existingFolderProblem(root, name, modId);
}

function writeLevel(
  folder: string,
  files: Map<string, Uint8Array>,
  note: ModioNote,
): void {
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  for (const [file, data] of files) {
    writeFileSync(join(folder, file), data);
  }
  writeFileSync(join(folder, MODIO_NOTE), JSON.stringify(note));
}

// unzips zip, downloaded from the mod.io level from, into level_src/ (root),
// noting where it's from, and replacing it if it was downloaded from there before;
// its folder's name
export function unzipLevel(
  root: string,
  zip: Uint8Array,
  from: ModioNote,
): Answer<{ name: string }> {
  const unzippedFiles = tryUnzip(zip);
  if (!unzippedFiles) {
    return { problem: "The download isn't a zip." };
  }
  const entries = zippedFiles(unzippedFiles);
  const name = levelFolderName(entries);
  if (name === null) {
    return { problem: "The zip doesn't hold one level's folder." };
  }
  const files = levelFiles(entries);
  const problem = unzipProblem(root, name, files, from.modId);
  if (problem) {
    return { problem };
  }
  writeLevel(join(root, name), files, from);
  return { name };
}
