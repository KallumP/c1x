// a level source's folder as a zip, to share it on mod.io (see doc/custom_levels.md):
// the folder itself, holding only the level's own files
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync, type Zippable } from "fflate";
import { readGameTextures } from "../builder/gameTextures";

// a .blend, or blender's backups of one (.blend1, ...)
const BLENDER_FILE = /\.blend\d*$/i;

// whether a file in the level's folder is shared: not hidden, not blender's,
// and not one of the game's own images, which each player's build makes
function isShared(file: string, gameImages: Set<string>): boolean {
  return !file.startsWith(".") && !BLENDER_FILE.test(file) && !gameImages.has(file);
}

// the files in level_src/<name> that go in its zip, folders inside it left out
function sharedLevelFiles(root: string, name: string): string[] {
  const folder = join(root, name);
  const gameImages = new Set(readGameTextures(folder).keys());
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isShared(entry.name, gameImages))
    .map((entry) => entry.name);
}

// level_src/<name> as a zip holding <name>/ and its shared files
export function zipLevel(root: string, name: string): Uint8Array {
  const files: Zippable = {};
  for (const file of sharedLevelFiles(root, name)) {
    files[`${name}/${file}`] = readFileSync(join(root, name, file));
  }
  return zipSync(files);
}
