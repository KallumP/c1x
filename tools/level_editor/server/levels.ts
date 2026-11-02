// the level sources in level_src/ (see doc/custom_levels.md), for the
// editor's dev server: which there are, their files, and their objects.json
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const DEFAULT_SCALE = 400; // MAP_SCALE in tools/nslevel.py

export interface LevelInfo {
  name: string;  // its folder
  obj: string;   // its .obj, in the folder
  scale: number; // game units per blender metre (level.cfg, or the default)
}

function objsIn(folder: string): string[] {
  return readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".obj"));
}

// scale from a level.cfg's "scale = n" line (build_level.py reads the same file)
function scaleIn(folder: string): number {
  const cfg = join(folder, "level.cfg");
  if (!existsSync(cfg)) return DEFAULT_SCALE;
  for (const line of readFileSync(cfg, "utf8").split(/\r?\n/)) {
    const m = /^\s*scale\s*=\s*(\d+)\s*$/.exec(line);
    if (m) return Number(m[1]);
  }
  return DEFAULT_SCALE;
}

// the level sources in root: its folders holding exactly one .obj, by name
export function listLevels(root: string): LevelInfo[] {
  return readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => ({ name, objs: objsIn(join(root, name)) }))
    .filter((l) => l.objs.length === 1)
    .map((l) => ({ name: l.name, obj: l.objs[0], scale: scaleIn(join(root, l.name)) }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

function levelFolder(root: string, name: string): string {
  if (!listLevels(root).some((l) => l.name === name)) throw new Error(`no level source ${name}`);
  return join(root, name);
}

// the path of file in a level's folder, or null if it isn't one (or is outside it)
export function levelFilePath(root: string, name: string, file: string): string | null {
  let folder: string;
  try { folder = levelFolder(root, name); } catch { return null; }
  const path = resolve(folder, file);
  const rel = relative(folder, path);
  if (rel.startsWith("..") || rel.includes(`..${sep}`) || resolve(path) === resolve(folder)) return null;
  return existsSync(path) && statSync(path).isFile() ? path : null;
}

// the text of a level's objects.json, or an empty list without one
export function readObjects(root: string, name: string): string {
  const path = join(levelFolder(root, name), "objects.json");
  return existsSync(path) ? readFileSync(path, "utf8") : "[]\n";
}

export function writeObjects(root: string, name: string, text: string): void {
  writeFileSync(join(levelFolder(root, name), "objects.json"), text);
}
