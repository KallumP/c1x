// a cut level exported for blender: its materials' images as pngs, and the
// scene (scene.ts) as json beside them, which scripts/blender/build_cut_level.py
// makes into a .blend and exports as the level source's .obj and .mtl
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { RgbImage } from "../../builder/images";
import type { Vec3 } from "../../builder/vectors";
import type { CutLevel } from "./readCutLevel";
import { cutLevelScene, type CutLevelScene } from "./scene";

export const SCENE_SCALE = 400;    // game units a blender metre (MAP_SCALE in builder/makeMap.ts)
export const SCENE_HALF_WIDTH = 7600; // across from the centre: a zone is 16384 across, with room for its margins
const CRASH = 0; // crash's entity type

// the game point that goes at blender's origin: the middle of the level's
// objects across, the lowest of them, and crash's spawn along the route
export function sceneCentre(level: CutLevel): Vec3 {
  const xs = level.entities.map(({ at }) => at[0]);
  const crash = level.entities.find(({ type }) => type === CRASH);
  if (!crash) {
    throw new Error("the level has no spawn (an entity of type 0)");
  }
  return [(Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...level.entities.map(({ at }) => at[1])), crash.at[2]];
}

function pngBytes(image: RgbImage): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    png.data.set([...image.rgb.subarray(3 * pixel, 3 * pixel + 3), 255], 4 * pixel);
  }
  return PNG.sync.write(png);
}

// the scene as json: its objects and materials (images are written as pngs)
const sceneJson = ({ objects, materials }: CutLevelScene) => JSON.stringify({ objects, materials });

// writes level's material images and its scene (name.scene.json) to outDir; the scene's path
export function exportCutLevel(level: CutLevel, outDir: string, name: string): string {
  const scene = cutLevelScene(level, { centre: sceneCentre(level), halfWidth: SCENE_HALF_WIDTH, scale: SCENE_SCALE });
  mkdirSync(outDir, { recursive: true });
  scene.images.forEach((image, file) => writeFileSync(join(outDir, file), pngBytes(image)));
  const scenePath = join(outDir, `${name}.scene.json`);
  writeFileSync(scenePath, sceneJson(scene));
  return scenePath;
}
