// objects.json positions are in blender (x, y, z up, metres); the viewport
// shows the .obj as it's written, which has blender's (x, z, -y), y up
import type { Vec3 } from "./objects";

export const BOX_UNITS = 400; // a box's size in game units (BOX_HEIGHT in tools/nslevel.py)

export function blenderToView([x, y, z]: Vec3): Vec3 {
  return [x, z, -y];
}

export function viewToBlender([x, y, z]: Vec3): Vec3 {
  return [x, -z + 0, y];
}

// a box's size in blender metres, for a level at scale game units a metre
export function boxSize(scale: number): number {
  return BOX_UNITS / scale;
}

// the middles (in blender) of a stack of boxes on the ground at at, raised by raise
export function stackCentres(at: Vec3, raise: number, stack: number, scale: number): Vec3[] {
  const size = boxSize(scale);
  return Array.from({ length: stack }, (_, k) => [at[0], at[1], at[2] + raise + size * k + size / 2] as Vec3);
}
