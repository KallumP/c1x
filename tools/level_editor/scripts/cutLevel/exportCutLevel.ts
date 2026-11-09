// a cut level exported for blender: its materials' images as pngs, and the
// scene (scene.ts) as json beside them, which scripts/blender/build_cut_level.py
// makes into a .blend and exports as the level source's .obj and .mtl
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { RgbImage } from "../../builder/images";
import type { Vec3 } from "../../builder/vectors";
import type { CutLevel } from "./readCutLevel";
import { formatObjects } from "../../src/objects";
import { collisionFloors, cutLevelObjects, platformPads } from "./objects";
import { cutLevelScene, type CutLevelScene, type SceneOptions } from "./scene";

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

// the material the most faces have, other than the acid and flat colours: the cave's rock
function mostUsedRock(scene: CutLevelScene): string {
  const counts = new Map<string, number>();
  scene.objects.flatMap(({ faces }) => faces).filter(({ material }) => material.startsWith("tex_"))
    .forEach(({ material }) => counts.set(material, (counts.get(material) ?? 0) + 1));
  return [...counts].sort((first, second) => second[1] - first[1])[0][0];
}

// the level's scene, with its platforms as pads, and its own floor as collision
function sceneWithPads(level: CutLevel, options: SceneOptions): CutLevelScene {
  const scene = cutLevelScene(level, options);
  return { ...scene, objects: [...scene.objects, platformPads(level, options, mostUsedRock(scene)), collisionFloors(level, options)] };
}

// its objects.json, unless it has one (which may have been changed in the level editor since)
function writeObjectsOnce(level: CutLevel, outDir: string, options: SceneOptions): void {
  const path = join(outDir, "objects.json");
  if (!existsSync(path)) {
    writeFileSync(path, formatObjects(cutLevelObjects(level, options)));
  }
}

// writes level's material images, its scene (name.scene.json) and its objects
// (objects.json, if it has none) to outDir; the scene's path
export function exportCutLevel(level: CutLevel, outDir: string, name: string): string {
  const placement = { centre: sceneCentre(level), scale: SCENE_SCALE };
  const route = cutLevelObjects(level, placement).map(({ at }) => at); // its spawn, boxes and end
  const options = { ...placement, halfWidth: SCENE_HALF_WIDTH, route };
  const scene = sceneWithPads(level, options);
  mkdirSync(outDir, { recursive: true });
  writeObjectsOnce(level, outDir, options);
  scene.images.forEach((image, file) => writeFileSync(join(outDir, file), pngBytes(image)));
  const scenePath = join(outDir, `${name}.scene.json`);
  writeFileSync(scenePath, sceneJson(scene));
  return scenePath;
}
