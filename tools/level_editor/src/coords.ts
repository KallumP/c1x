// objects.json positions are in blender (x, y, z up, metres); the viewport
// shows the .obj as it's written, which has blender's (x, z, -y), y up
import type { Vec3 } from "./objects";

export const BOX_UNITS = 400;     // a box's size in game units (BOX_HEIGHT in builder/entities.ts)
export const DEFAULT_SCALE = 400; // game units a blender metre without a level.cfg (MAP_SCALE in builder/makeMap.ts)
export const STONE_RADIUS_UNITS = 360; // a rolling stone's radius in game units (STONE_RADIUS in builder/enemyPaths.ts)

export function blenderToView([x, y, z]: Vec3): Vec3 {
  return [x, z, -y];
}

export function viewToBlender([x, y, z]: Vec3): Vec3 {
  return [x, -z + 0, y]; // + 0 turns -0 into 0
}

// the way the game's camera faces at the start (in blender), for a level the build turns by
// turn degrees: blender +y unturned, the other way round as the level turns anticlockwise
const FACINGS: Vec3[] = [[0, 1, 0], [1, 0, 0], [0, -1, 0], [-1, 0, 0]];

export function cameraFacing(turn: number): Vec3 {
  const quarters = Math.round(turn / 90);
  return FACINGS[((quarters % 4) + 4) % 4];
}

// a box's size in blender metres, for a level at scale game units a metre
export function boxSize(scale: number): number {
  return BOX_UNITS / scale;
}

// the middles (in blender) of a stack of boxes standing at at, raised by raise
export function stackCentres(at: Vec3, raise: number, stack: number, scale: number): Vec3[] {
  const size = boxSize(scale);
  return Array.from({ length: stack }, (_, k) => [at[0], at[1], at[2] + raise + size * k + size / 2] as Vec3);
}
