// the level sources in level_src/ (see doc/custom_levels.md), for the
// editor's dev server: which there are, their files, and their objects.json
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { readGameTextures, writeGameTextures } from "../builder/gameTextures";
import { isAudioSongName } from "../src/music";
import { parseLevelCfg } from "./levelCfg";

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

export function levelFolder(root: string, name: string): string {
  if (!listLevels(root).some((level) => level.name === name)) {
    throw new Error(`no level source ${name}`);
  }
  return join(root, name);
}

// the path of file in a level's folder, or null if it isn't one (or is outside it)
export function levelFilePath(root: string, name: string, file: string): string | null {
  let folder: string;
  try {
    folder = levelFolder(root, name);
  } catch {
    return null;
  }
  const path = resolve(folder, file);
  const fromFolder = relative(folder, path);
  if (fromFolder.startsWith("..") || fromFolder.includes(`..${sep}`) || resolve(path) === resolve(folder)) {
    return null;
  }
  return existsSync(path) && statSync(path).isFile() ? path : null;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

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
    warn(messageOf(error));
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
