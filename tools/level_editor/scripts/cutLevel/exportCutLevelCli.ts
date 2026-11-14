// npm run export-cut-level -- <nsf> <name> [blender]: exports a level cut from
// the game (such as streams/s0000004.nsf, the acid cave) to level_src/<name>:
// its textures as pngs (and where each is in the game, in game_textures.json), and with blender (headless), its .blend, .obj and .mtl
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportCutLevel } from "./exportCutLevel";
import { readCutLevel } from "./readCutLevel";

const LEVEL_SRC = fileURLToPath(new URL("../../../../level_src", import.meta.url));
const BLENDER_SCRIPT = fileURLToPath(new URL("../blender/build_cut_level.py", import.meta.url));

const USAGE = `usage: npm run export-cut-level -- <nsf> <name> [blender]

  nsf      a cut level's .nsf, such as streams/s0000004.nsf (the acid cave)
  name     the level source to make: level_src/<name>
  blender  blender.exe, to make its .blend, .obj and .mtl (without it, only its images and scene)`;

// makes the .blend, .obj and .mtl; not over a .blend there already, which may have been changed in blender since
function runBlender(blender: string, scenePath: string, folder: string, name: string): void {
  const blend = join(folder, `${name}.blend`);
  if (existsSync(blend)) {
    rmSync(scenePath);
    throw new Error(`${blend} is there already, and may have been changed in blender: move it away to make it again`);
  }
  const args = ["--background", "--python", BLENDER_SCRIPT, "--", scenePath, join(folder, `${name}.blend`), join(folder, `${name}.obj`)];
  execFileSync(blender, args, { stdio: "inherit" });
  rmSync(scenePath);
}

const [nsf, name, blender] = process.argv.slice(2);
if (!nsf || !name) {
  console.log(USAGE);
  process.exitCode = 1;
} else {
  const folder = join(LEVEL_SRC, name);
  const scenePath = exportCutLevel(readCutLevel(nsf), folder, name, basename(nsf, extname(nsf)));
  if (blender) {
    runBlender(blender, scenePath, folder, name);
  }
  console.log(`wrote ${folder}`);
}
