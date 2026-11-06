// the paths crabs and turtles walk back and forth along: nodes, in metres from
// where the enemy stands, set in the editor or their defaults (as n. sanity beach's)
import { cameraFacing, CRAB_WALK, stoneRolling, TURTLE_WALK } from "./coords";
import type { LevelObject, Vec3 } from "./objects";

export const DEFAULT_PATH_NODES = 5;

// how far apart a path's points are in the game, in game units: as n. sanity
// beach's crabs' and turtles' are. the game moves an enemy a point at a time,
// so this keeps it walking at its own speed
export const PATH_STEP = 100;

type PathEnemy = "crab" | "turtle";

const plus = (first: Vec3, second: Vec3): Vec3 => [first[0] + second[0], first[1] + second[1], first[2] + second[2]];
const scaled = (vector: Vec3, factor: number): Vec3 => [vector[0] * factor, vector[1] * factor, vector[2] * factor];
const distance = (first: Vec3, second: Vec3) => Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);

// count nodes in equal steps along a straight line from start to end
function straightNodes(start: Vec3, end: Vec3, count: number): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const along = count === 1 ? 0 : index / (count - 1);
    return plus(start, scaled(plus(end, scaled(start, -1)), along));
  });
}

// the way an enemy walks without a path of its own (in blender): a crab across
// the map, as the game walks it; a turtle along the route, the way the camera faces
function defaultWay(enemy: PathEnemy, turn: number): { way: Vec3; walk: number } {
  return enemy === "crab" ? { way: stoneRolling(turn), walk: CRAB_WALK } : { way: cameraFacing(turn), walk: TURTLE_WALK };
}

// a crab's or turtle's path without one of its own: n. sanity beach's length,
// straight, its middle where it stands, in equal steps
export function defaultPath(enemy: PathEnemy, turn: number, scale: number): Vec3[] {
  const { way, walk } = defaultWay(enemy, turn);
  const half = scaled(way, walk / 2 / scale);
  return straightNodes(scaled(half, -1), half, DEFAULT_PATH_NODES);
}

// an enemy's path nodes: its own, or its default
export function enemyPath(object: LevelObject, turn: number, scale: number): Vec3[] {
  return object.path ?? defaultPath(object.enemy as PathEnemy, turn, scale);
}

// where an enemy's path nodes are in blender: from where it stands, raised
export function pathPositions(object: LevelObject, turn: number, scale: number): Vec3[] {
  const [x, y, z] = object.at;
  const standing: Vec3 = [x, y, z + object.raise];
  return enemyPath(object, turn, scale).map((node) => plus(standing, node));
}

// how long a path is, along all its nodes
export function pathLength(nodes: Vec3[]): number {
  return nodes.slice(1).reduce((sum, node, index) => sum + distance(nodes[index], node), 0);
}

// the point along a path, distance from its first node
function pointAlong(nodes: Vec3[], wanted: number): Vec3 {
  let travelled = 0;
  for (let index = 1; index < nodes.length; index++) {
    const step = distance(nodes[index - 1], nodes[index]);
    if (travelled + step >= wanted && step > 0) {
      const start = nodes[index - 1];
      const share = (wanted - travelled) / step;
      return plus(start, scaled(plus(nodes[index], scaled(start, -1)), share));
    }
    travelled += step;
  }
  return nodes[nodes.length - 1];
}

// a path in steps as near step long as fit evenly, from its first node to its last
export function inEvenSteps(nodes: Vec3[], step: number): Vec3[] {
  return respaced(nodes, Math.max(1, Math.round(pathLength(nodes) / step)) + 1);
}

// count nodes evenly along a path, from its first node to its last, keeping its shape
export function respaced(nodes: Vec3[], count: number): Vec3[] {
  const length = pathLength(nodes);
  return Array.from({ length: count }, (_, index) => pointAlong(nodes, (length * index) / (count - 1)));
}
