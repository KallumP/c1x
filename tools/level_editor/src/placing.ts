// where a click on the level puts an object
import { viewToBlender } from "./coords";
import type { Vec3 } from "./objects";

const FLOOR = 0.5; // a face is floor if its normal points at least this much up

const snap = (metres: number, grid: number) => (grid > 0 ? Math.round(metres / grid) * grid : metres);
const roundToMillimetre = (metres: number) => Math.round(metres * 1000) / 1000 + 0; // + 0 turns -0 into 0

// the blender position for a click that hit the level at point (viewport), on a
// face with normal (viewport, unit); null off the floor, as the build puts objects
// on the ground below them, not where a wall was clicked. grid snaps x and y (0: none)
export function placeOnFloor(point: Vec3, normal: Vec3, grid: number): Vec3 | null {
  if (normal[1] < FLOOR) {
    return null;
  }
  const [x, y, z] = viewToBlender(point);
  return [roundToMillimetre(snap(x, grid)), roundToMillimetre(snap(y, grid)), roundToMillimetre(z)];
}
