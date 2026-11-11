// a mossy slide: the great gate's invisible slider (WalOC subtype 2), which
// carries crash down the slope under it. custom levels' slopes are the map's own,
// modelled to match what the editor draws; the slider runs along its top
import type { Vec3 } from "./vectors";

const SLIDE_PAST_SLOPE = 400; // how far its path goes on past the slope (the great gate's: 2000 over a 1600 plank)
const SLIDE_STEP = 450;       // how far apart its points are, about (the great gate's long slides': 3600 in 8)

// the slider's path along a slope length long along the floor (game units) from
// its top end, down at angle degrees, and on past its other end, its points
// about SLIDE_STEP apart. it goes across the map (the game's x) turned rotation
// degrees anticlockwise seen from above, towards -z (away from the camera)
export function mossySlidePath(length: number, angle: number, rotation: number): Vec3[] {
  const radians = (rotation * Math.PI) / 180;
  const [wayX, wayZ] = [Math.cos(radians), -Math.sin(radians)];
  const drop = Math.tan((angle * Math.PI) / 180);
  const run = length + SLIDE_PAST_SLOPE;
  const steps = Math.max(1, Math.round(run / SLIDE_STEP));
  return Array.from({ length: steps + 1 }, (_, point) => {
    const x = (run * point) / steps;
    return [wayX * x + 0, -drop * x + 0, wayZ * x + 0] as Vec3; // + 0 turns -0 into 0
  });
}
