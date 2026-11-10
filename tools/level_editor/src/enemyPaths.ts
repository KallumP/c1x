// the paths crabs, turtles and natives walk back and forth along, and badgers run along: nodes, in metres
// from where the enemy stands, set in the editor or their defaults (as their donor levels')
import { BADGER_RUN, batSwoopEnd, cameraFacing, labAssistantThrow, leaderBatsGap, LIZARD_LEAPS, MONKEY_WALK, RED_LIZARD_HOPS, ROBOT_DOG_WALK, WALKING_SPIDER_RUN, WARTHOG_RUN, CRAB_WALK, NATIVE_WALK, stoneRolling, TURTLE_WALK } from "./coords";
import { LAB_ASSISTANT_REACH } from "./labAssistantThrow";
import { hasOneNode, PATH_NODES_MAX, type LevelObject, type PathEnemy, type Vec3 } from "./objects";

export const DEFAULT_PATH_NODES = 3;

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

// the way along the route back towards the spawn (in blender), for a level turned by turn degrees
const towardsSpawn = (turn: number) => scaled(cameraFacing(turn), -1);

// each path enemy as its own level has it: how long its path is (game units),
// which way it goes without a path of its own (in blender, for a level turned
// by turn degrees), and how far apart its path's points are in the game (game
// units, as its level's are). the game moves an enemy a point at a time, so its
// step keeps it at its own speed
interface PathEnemyRun {
  length: number;
  way: (turn: number) => Vec3;
  step: number;
}

// crabs, natives, monkeys and lizards go across the map, as their levels have them; turtles and
// warthogs (and robot dogs, as heavy machinery is side-on) along the route, the way the camera faces; badgers and walking spiders
// along it the other way, at crash
const PATH_ENEMY_RUNS: Record<PathEnemy, PathEnemyRun> = {
  crab: { length: CRAB_WALK, way: stoneRolling, step: 100 },                 // n. sanity beach's crabs' points
  turtle: { length: TURTLE_WALK, way: cameraFacing, step: 100 },             // n. sanity beach's turtles' points
  native: { length: NATIVE_WALK, way: stoneRolling, step: NATIVE_WALK / 4 }, // the great gate's natives' paths are 4 steps
  badger: { length: BADGER_RUN, way: towardsSpawn, step: 400 },              // jungle rollers' badger spawners' points
  warthog: { length: WARTHOG_RUN, way: cameraFacing, step: 744 },            // road to nowhere's warthogs' points
  walking_spider: { length: WALKING_SPIDER_RUN, way: towardsSpawn, step: 800 }, // fumbling in the dark's walking spiders' points, on average
  monkey: { length: MONKEY_WALK, way: stoneRolling, step: 480 },             // the great gate's monkeys' points
  lizard: { length: LIZARD_LEAPS, way: stoneRolling, step: 1600 },          // the lost city's green lizards' leaps
  red_lizard: { length: RED_LIZARD_HOPS, way: stoneRolling, step: 800 },    // the lost city's red lizards' hops
  robot_dog: { length: ROBOT_DOG_WALK, way: cameraFacing, step: 400 },       // heavy machinery's robot dogs' points, mostly
};

// how far apart a path's points are in the game for an enemy, at its own speed
export const pathStep = (enemy: PathEnemy) => PATH_ENEMY_RUNS[enemy].step;

// a path enemy's path without one of its own: its own level's length,
// straight, its middle where it stands, in equal steps
export function defaultPath(enemy: PathEnemy, turn: number, scale: number): Vec3[] {
  const { length, way } = PATH_ENEMY_RUNS[enemy];
  const half = scaled(way(turn), length / 2 / scale);
  return straightNodes(scaled(half, -1), half, DEFAULT_PATH_NODES);
}

// an enemy's nodes without a path of its own: leader bats' second leader
// where it hovers by default, a bat roost's swoop's end where temple ruins'
// ends, a lab assistant's landing spot where stormy ascent's first's vials
// land, or a path enemy's default path
function defaultNodes(object: LevelObject, turn: number, scale: number): Vec3[] {
  if (object.enemy === "leader_bats") {
    return [leaderBatsGap(turn, scale)];
  }
  if (object.enemy === "bat") {
    return [batSwoopEnd(turn, scale)];
  }
  if (object.enemy === "lab_assistant") {
    return [labAssistantThrow(turn).map((value) => (value * LAB_ASSISTANT_REACH) / scale) as Vec3];
  }
  return defaultPath(object.enemy as PathEnemy, turn, scale);
}

// an enemy's path nodes (a one node enemy's, its node): its own, or its default
export function enemyPath(object: LevelObject, turn: number, scale: number): Vec3[] {
  return object.path ?? defaultNodes(object, turn, scale);
}

// where an enemy's path nodes are in blender: from where it stands, raised
export function pathPositions(object: LevelObject, turn: number, scale: number): Vec3[] {
  const [x, y, z] = object.at;
  const standing: Vec3 = [x, y, z + object.raise];
  return enemyPath(object, turn, scale).map((node) => plus(standing, node));
}

// a one node enemy's spot and its node (in blender): where the object is,
// raised, then its path's node. leader bats' two leaders, or a bat roost and its swoop's end
export function spotAndNode(object: LevelObject, turn: number, scale: number): Vec3[] {
  const [x, y, z] = object.at;
  return [[x, y, z + object.raise], ...pathPositions(object, turn, scale)];
}

// how many nodes an enemy's path has: its own, or its default's (a one node enemy's one)
export function nodeCount(object: LevelObject): number {
  if (object.path) {
    return object.path.length;
  }
  if (hasOneNode(object.enemy)) {
    return 1;
  }
  return DEFAULT_PATH_NODES;
}

// what a one node enemy's node is called in the editor
const ONE_NODE_HEADINGS: Partial<Record<string, string>> = { leader_bats: "leader 2", bat: "swoop's end", lab_assistant: "landing spot" };

// a selected node's heading in the editor: a one node enemy's what its node
// is, or which node of a path enemy's path
export function nodeHeading(object: LevelObject, node: number): string {
  return ONE_NODE_HEADINGS[object.enemy ?? ""] ?? `node ${node + 1} of ${nodeCount(object)}`;
}

// an enemy's path with one of its nodes moved to position (in blender), the rest
// as they were; an enemy without a path of its own gets its default path
export function withNodeAt(object: LevelObject, node: number, position: Vec3, turn: number, scale: number): Vec3[] {
  const [x, y, z] = object.at;
  const offset: Vec3 = [position[0] - x, position[1] - y, position[2] - z - object.raise];
  return enemyPath(object, turn, scale).map((other, index) => (index === node ? offset : other));
}

// a path's nodes respaced to count of them (2 to PATH_NODES_MAX), evenly along it from its first to its last
export function inNodes(path: Vec3[], count: number): Vec3[] {
  return respaced(path, Math.min(PATH_NODES_MAX, Math.max(2, Math.round(count))));
}

// an enemy's path (its default if it has none) with count nodes, evenly along it
export function withNodeCount(object: LevelObject, count: number, turn: number, scale: number): Vec3[] {
  return inNodes(enemyPath(object, turn, scale), count);
}

// which of a path's nodes (in blender) are under the enemy drawn at either end:
// the ends, and any node within reach of one, seen from above
export function nodesUnderEnds(positions: Vec3[], reach: number): boolean[] {
  const ends = [positions[0], positions[positions.length - 1]];
  const flatDistance = (first: Vec3, second: Vec3) => Math.hypot(first[0] - second[0], first[1] - second[1]);
  return positions.map((position) => ends.some((end) => flatDistance(position, end) <= reach));
}

// how high a node's handle floats above it (metres), so it can be seen and
// clicked: clear of the enemy for a node under one at an end of its path
// (enemyHeight), up to the floor for a node under the ground (depth, from
// floorAbove), the higher of the two for both, and not at all otherwise
function handleLift(underEnd: boolean, depth: number | null, enemyHeight: number): number {
  let lift = 0;
  if (underEnd) {
    lift = enemyHeight;
  }
  if (depth !== null) {
    lift = Math.max(lift, depth);
  }
  return lift;
}

// each of a path's nodes' handle lifts (see handleLift)
export function handleLifts(underEnds: boolean[], depths: (number | null)[], enemyHeight: number): number[] {
  return underEnds.map((underEnd, node) => handleLift(underEnd, depths[node], enemyHeight));
}

// an enemy's path turned round (its nodes reversed, its default's if it has
// none), so it starts at the other end: the game starts it at its first node
export function turnedRound(object: LevelObject, turn: number, scale: number): Vec3[] {
  return [...enemyPath(object, turn, scale)].reverse();
}

// which node a node is once its path, of count nodes, is turned round
export const nodeTurnedRound = (node: number, count: number) => count - 1 - node;

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

// the point share (0 to 1) of the way along a path, from its first node
export const pointAlongShare = (nodes: Vec3[], share: number): Vec3 => pointAlong(nodes, pathLength(nodes) * share);

// a path in steps as near step long as fit evenly, from its first node to its last
export function inEvenSteps(nodes: Vec3[], step: number): Vec3[] {
  return respaced(nodes, Math.max(1, Math.round(pathLength(nodes) / step)) + 1);
}

// count nodes evenly along a path, from its first node to its last, keeping its shape
export function respaced(nodes: Vec3[], count: number): Vec3[] {
  const length = pathLength(nodes);
  return Array.from({ length: count }, (_, index) => pointAlong(nodes, (length * index) / (count - 1)));
}
