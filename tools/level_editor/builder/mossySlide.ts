// a mossy slide: the great gate's invisible slider (WalOC subtype 2), which
// carries crash down the slope under it. custom levels' slopes are the map's own,
// modelled to match what the editor draws; the slider runs along its top
import type { Vec3 } from "./vectors";

const SLIDE_PAST_SLOPE = 400; // how far its path goes on past the slope (the great gate's: 2000 over a 1600 plank)
const SLIDE_STEP = 450;       // how far apart its points are, about (the great gate's long slides': 3600 in 8)

// which way along the game's x a slide runs: on, or back reversed
function slideWay(reverse: boolean): number {
  if (reverse) {
    return -1;
  }
  return 1;
}

// the slider's path along a slope length long across the map (game units) from
// its top end, down at angle degrees, and on past its other end, its points about SLIDE_STEP apart
export function mossySlidePath(length: number, angle: number, reverse: boolean): Vec3[] {
  const way = slideWay(reverse);
  const drop = Math.tan((angle * Math.PI) / 180);
  const run = length + SLIDE_PAST_SLOPE;
  const steps = Math.max(1, Math.round(run / SLIDE_STEP));
  return Array.from({ length: steps + 1 }, (_, point) => {
    const x = (run * point) / steps;
    return [way * x + 0, -drop * x + 0, 0] as Vec3; // + 0 turns -0 into 0
  });
}
