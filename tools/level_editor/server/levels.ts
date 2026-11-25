// the level sources in level_src/ (see doc/custom_levels.md), for the
// editor's dev server: which there are, their files, and their objects.json
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { readGameTextures, writeGameTextures } from "../builder/gameTextures";
import { fileNameOf } from "../src/imagePaths";
import { isAudioSongName } from "../src/music";
import { parseLevelCfg } from "./levelCfg";
import { errorMessage } from "../src/errorMessage";

export interface LevelInfo {
  name: string;  // its folder
  obj: string;   // its .obj, in the folder
  scale: number; // game units per blender metre (level.cfg, or the default)
  songs: string[]; // the audio files in the folder, any of which it can pick as its song
}

function objsIn(folder: string): string[] {
  return readdirSync(folder).filter((file) => file.toLowerCase().endsWith(".obj"));
}

// the audio files in the folder, by name (any case)
function songsIn(folder: string): string[] {
  return readdirSync(folder)
    .filter((file) => isAudioSongName(file) && statSync(join(folder, file)).isFile())
    .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: "base" }));
}

// scale from the folder's level.cfg (the level build reads the same file), or the default
function scaleIn(folder: string): number {
  const cfg = join(folder, "level.cfg");
  return parseLevelCfg(existsSync(cfg) ? readFileSync(cfg, "utf8") : "").scale;
}

// the level sources in root: its folders holding exactly one .obj, by name
export function listLevels(root: string): LevelInfo[] {
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => ({ name, objs: objsIn(join(root, name)) }))
    .filter((folder) => folder.objs.length === 1)
    .map((folder) => ({ name: folder.name, obj: folder.objs[0], scale: scaleIn(join(root, folder.name)), songs: songsIn(join(root, folder.name)) }))
    .sort((first, second) => (first.name < second.name ? -1 : 1));
}

// root's included_levels.txt: the levels that come with c1x, one folder a line,
// lines starting with # saying what it is (the launcher reads it too, levels.c)
const INCLUDED_LEVELS_FILE = "included_levels.txt";

// the folders of the levels that come with c1x, in root
export function includedLevels(root: string): string[] {
  const file = join(root, INCLUDED_LEVELS_FILE);
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

// whether root has a level source called name
export const hasLevelSource = (root: string, name: string) =>
  listLevels(root).some((level) => level.name === name);

export function levelFolder(root: string, name: string): string {
  if (!hasLevelSource(root, name)) {
    throw new Error(`no level source ${name}`);
  }
  return join(root, name);
}

// the path of file in a level's folder, or else the folder's file of the same
// name (as for a .mtl's image Blender wrote as a whole path; see src/imagePaths.ts),
// or null if neither is there. nothing outside the folder is given
export function levelFilePath(root: string, name: string, file: string): string | null {
  let folder: string;
  try {
    folder = levelFolder(root, name);
  } catch {
    return null;
  }
  return fileInFolder(folder, file) ?? fileInFolder(folder, fileNameOf(file));
}

// the file at file's path in folder, or null if there isn't one (or it's outside folder)
function fileInFolder(folder: string, file: string): string | null {
  const path = resolve(folder, file);
  const fromFolder = relative(folder, path);
  if (fromFolder.startsWith("..") || fromFolder.includes(`..${sep}`) || isAbsolute(fromFolder) || path === resolve(folder)) {
    return null;
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    return null;
  }
  return path;
}

// whether file is one of a level's game textures that isn't in its folder yet
function isMissingGameTexture(folder: string, file: string): boolean {
  try {
    return readGameTextures(folder).has(file) && !existsSync(join(folder, file));
  } catch {
    return false;
  }
}

// a file in a level's folder, as levelFilePath gives it; a game texture that
// isn't there is made first (with the level's others) from the game's files in
// streamsDir, and one that can't be is warned about and not found
export function levelFileMakingGameTextures(root: string, streamsDir: string, name: string, file: string, warn: (line: string) => void): string | null {
  const folder = levelFolderOrNull(root, name);
  if (folder && isMissingGameTexture(folder, file)) {
    makeGameTextures(folder, streamsDir, (line) => warn(`${name}: ${line}`));
  }
  return levelFilePath(root, name, file);
}

function levelFolderOrNull(root: string, name: string): string | null {
  try {
    return levelFolder(root, name);
  } catch {
    return null;
  }
}

function makeGameTextures(folder: string, streamsDir: string, warn: (line: string) => void): void {
  try {
    writeGameTextures(folder, streamsDir);
  } catch (error) {
    warn(errorMessage(error));
  }
}

// the text of a level's objects.json, or an empty list without one
export function readObjects(root: string, name: string): string {
  const path = join(levelFolder(root, name), "objects.json");
  return existsSync(path) ? readFileSync(path, "utf8") : "[]\n";
}

// written with the line endings the file had, so a windows checkout's crlf ones don't all show as changed
export function writeObjects(root: string, name: string, text: string): void {
  const path = join(levelFolder(root, name), "objects.json");
  const crlf = existsSync(path) && readFileSync(path, "utf8").includes("\r\n");
  writeFileSync(path, crlf ? text.replace(/\r?\n/g, "\r\n") : text);
}
