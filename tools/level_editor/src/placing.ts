// where a click on the level puts an object
import { viewToBlender } from "./coords";
import type { Vec3 } from "./objects";

const FLOOR = 0.5; // a face is floor if its normal points at least this much up

// a hit face's normal, turned to face back along the ray (the camera's side),
// as faces are drawn from both sides and can be wound either way
export function towardsViewer(normal: Vec3, ray: Vec3): Vec3 {
  const facing = normal[0] * ray[0] + normal[1] * ray[1] + normal[2] * ray[2];
  return facing > 0 ? [-normal[0], -normal[1], -normal[2]] : normal;
}

const snap = (metres: number, grid: number) => (grid > 0 ? Math.round(metres / grid) * grid : metres);
const roundToMillimetre = (metres: number) => Math.round(metres * 1000) / 1000 + 0; // + 0 turns -0 into 0

// the blender position for a click that hit the level at point (viewport), on a
// face with normal (viewport, unit); null off the floor, so objects go on floors,
// not in walls. grid snaps x and y (0: none)
export function placeOnFloor(point: Vec3, normal: Vec3, grid: number): Vec3 | null {
  if (normal[1] < FLOOR) {
    return null;
  }
  const [x, y, z] = viewToBlender(point);
  return [roundToMillimetre(snap(x, grid)), roundToMillimetre(snap(y, grid)), roundToMillimetre(z)];
}
