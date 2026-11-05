// the paths enemies move along in a custom level, in zone units: a plant stays
// at its spot; a rolling stone rolls back and forth along its path, which the
// game takes a point at a time, so the points are spaced evenly to roll as
// fast whatever the path's length, and closer at the ends, where it turns round
import type { EnemyType } from "../src/objects";
import type { Vec3 } from "./vectors";

export const ROLL_STEP = 360; // zone units between a rolling stone's points, on average (jungle rollers' roll 3600 in 10)
export const STONE_RADIUS = 360; // zone units: its path is the wheel's middle, so it's this far over the ground under it

const distance = (from: Vec3, to: Vec3) => Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
const ease = (t: number) => t * t * (3 - 2 * t); // slow at both ends

// the point distance along the path through points (each segment's length in lengths)
function pointAlong(points: Vec3[], lengths: number[], along: number): Vec3 {
  let left = along;
  for (let index = 0; index < lengths.length; index++) {
    if (left <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] === 0 ? 0 : Math.min(left / lengths[index], 1);
      const [from, to] = [points[index], points[index + 1]];
      return [0, 1, 2].map((axis) => from[axis] + (to[axis] - from[axis]) * t) as Vec3;
    }
    left -= lengths[index];
  }
  return points[0];
}

// points along the path through points, about ROLL_STEP apart, eased at the ends
function rollingPath(points: Vec3[]): Vec3[] {
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const steps = Math.max(2, Math.round(total / ROLL_STEP));
  return Array.from({ length: steps + 1 }, (_, step) =>
    (step === steps ? points[points.length - 1] : pointAlong(points, lengths, total * ease(step / steps))));
}

// the base level's path (example, from its own spot) moved to start at start, on level ground there
function examplePathAt(example: Vec3[], [x, y, z]: Vec3): Vec3[] {
  const [first] = example;
  return example.map(([exampleX, , exampleZ]) => [x + exampleX - first[0], y, z + exampleZ - first[2]]);
}

// points turned round if they end further +x than they start. the stone always
// faces the same way and spins by which way along its path it's going, the
// right way for rolling -x (as all of jungle rollers' paths run)
function runningMinusX(points: Vec3[]): Vec3[] {
  return points[points.length - 1][0] > points[0][0] ? [...points].reverse() : points;
}

// the path an enemy of type moves along, from points (its spot, then the path it was given) or,
// for a rolling stone given no path, the base level's own (example)
export function enemyPath(type: EnemyType, points: Vec3[], example: Vec3[]): Vec3[] {
  if (type === "plant") {
    return [points[0]];
  }
  const path = points.length > 1 ? rollingPath(runningMinusX(points)) : examplePathAt(example, points[0]);
  return path.map(([x, y, z]) => [x, y + STONE_RADIUS, z]);
}
