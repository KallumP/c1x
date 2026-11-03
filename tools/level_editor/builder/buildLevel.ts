// building a level from its source, a map modelled in blender (see
// doc/custom_levels.md): its faces as the level's geometry and collision,
// crash, and the objects its objects.json places, from the base level. the
// level goes to build/levels/<name>, next to the game
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { LevelObject } from "../src/objects";
import { BASE_LEVEL } from "./baseLevel";
import { TooBig } from "./fit";
import { readImage, type RgbImage } from "./images";
import { levelOptions, type LevelOptions } from "./levelCfg";
import { readLevel } from "./levelFiles";
import { readObjectsFile } from "./levelObjects";
import { writeLevel } from "./levelWriting";
import { makeMap } from "./makeMap";
import { readMtl } from "./obj";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
export const LEVEL_SOURCES_DIR = join(REPO, "level_src");
export const STREAMS_DIR = join(REPO, "streams");
export const LEVELS_DIR = join(REPO, "build", "levels"); // next to the game; see LEVELS_DIR in src/pc/settings.h

export interface BuildOptions {
  streamsDir: string;
  levelsDir: string;
  log: (line: string) => void; // what the build says: warnings, then what it wrote or why it failed
}

const isFolder = (path: string) => existsSync(path) && statSync(path).isDirectory();

// the level source to build: a level's name (its folder in sourcesDir), or a path to one
export function levelSourcePath(nameOrPath: string, sourcesDir = LEVEL_SOURCES_DIR): string {
  const named = join(sourcesDir, nameOrPath);
  return !existsSync(nameOrPath) && isFolder(named) ? named : nameOrPath;
}

// the .obj to build a level from, and the level's name, for path: a level
// source's folder (holding its one .obj, named after the folder) or a .obj (named after the file)
export function levelSource(path: string): { objPath: string; name: string } {
  const source = normalize(path).replace(/[\\/]+$/, "");
  if (!isFolder(source)) {
    return { objPath: source, name: basename(source, extname(source)) };
  }
  const objs = readdirSync(source).filter((file) => file.toLowerCase().endsWith(".obj")).sort();
  if (objs.length !== 1) {
    throw new Error(`${source} has ${objs.length} .obj files; a level source's folder needs exactly one`);
  }
  return { objPath: join(source, objs[0]), name: basename(source) };
}

// the .mtl files a .obj's text names
const materialLibraries = (text: string) => text.split(/\r?\n/).map((line) => line.trim().split(/\s+/))
  .filter(([keyword]) => keyword === "mtllib").map(([, ...name]) => name.join(" "));

function readImageOrWarn(path: string, material: string, warn: (line: string) => void): RgbImage | null {
  if (!existsSync(path)) {
    warn(`warning: ${path} (material ${material}) not found, so it is untextured`);
    return null;
  }
  try {
    return readImage(path);
  } catch (error) {
    warn(`warning: ${error instanceof Error ? error.message : error} (material ${material}), so it is untextured`);
    return null;
  }
}

// each material's image, from the .mtl files a .obj (its path and text) names,
// next to it. missing files are skipped with a warning
export function mapImages(objPath: string, text: string, warn: (line: string) => void): Map<string, RgbImage> {
  const images = new Map<string, RgbImage>();
  for (const library of materialLibraries(text)) {
    const mtlPath = join(dirname(objPath), library);
    if (!existsSync(mtlPath)) {
      warn(`warning: ${mtlPath} not found, so its materials are untextured`);
      continue;
    }
    for (const [material, imagePath] of readMtl(readFileSync(mtlPath, "utf8"), dirname(mtlPath))) {
      const image = readImageOrWarn(imagePath, material, warn);
      if (image) {
        images.set(material, image);
      }
    }
  }
  return images;
}

// the largest scale (rounded down to a 10) at which a map that was too big at scale fits
export function fittingScale(scale: number, tooBig: TooBig): number {
  const fits = Math.trunc((scale * (tooBig.sideMax - tooBig.fixed)) / (tooBig.extent - tooBig.fixed));
  return Math.floor(fits / 10) * 10;
}

interface LevelSource {
  objPath: string;
  name: string;
  options: LevelOptions;
  objects: LevelObject[];
}

function readLevelSource(source: string): LevelSource {
  const { objPath, name } = levelSource(source);
  const folder = dirname(objPath);
  return { objPath, name, options: levelOptions(folder), objects: readObjectsFile(folder) };
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function failureMessage(error: unknown, source: string, scale: number): string {
  if (error instanceof TooBig) {
    return `${source}: at scale ${scale} it's ${error.extent} units along ${"xyz"[error.axis]}, and the game's collision only `
      + `reaches ${error.sideMax}. set its scale to ${fittingScale(scale, error)} or less (under Level in the level editor)`;
  }
  return `${source}: ${messageOf(error)}`;
}

// builds the level source at source (a folder or a .obj) into levelsDir; whether it did
export function buildLevel(source: string, { streamsDir, levelsDir, log }: BuildOptions): boolean {
  let level: LevelSource;
  try {
    level = readLevelSource(source);
  } catch (error) {
    log(messageOf(error));
    return false;
  }
  if (!existsSync(join(streamsDir, `${BASE_LEVEL.file}.nsd`))) {
    log(`${BASE_LEVEL.name} (${BASE_LEVEL.file}.nsd) isn't in ${streamsDir}, so there's nothing to build the level from (see doc/running.md)`);
    return false;
  }
  const { objPath, name, options, objects } = level;
  try {
    const text = readFileSync(objPath, "utf8");
    const images = mapImages(objPath, text, log);
    writeLevel(makeMap(readLevel(streamsDir, BASE_LEVEL.lid), text, { ...options, images, objects }), levelsDir, name);
  } catch (error) {
    log(failureMessage(error, source, options.scale));
    return false;
  }
  log(`wrote ${join(levelsDir, name)}`);
  return true;
}
