// objects.json positions are in blender (x, y, z up, metres); the viewport
// shows the .obj as it's written, which has blender's (x, z, -y), y up
import type { Vec3 } from "./objects";

export const BOX_UNITS = 400;     // a box's size in game units (BOX_HEIGHT in builder/entities.ts)
export const DEFAULT_SCALE = 400; // game units a blender metre without a level.cfg (MAP_SCALE in builder/makeMap.ts)

// jungle rollers' rolling stone and its track, in game units (stoneTrack in
// builder/templates.ts): the stone's radius, over the track's floor under the
// middle of its path; how far that floor stands over the stone's spot (a box's
// height, STONE_TRACK_LIFT in builder/templates.ts); the track's length along
// the path and its width across; and the path, from its first point (along -x,
// and up), dipping in the middle
export const STONE_TRACK = {
  radius: 705,
  lift: BOX_UNITS,
  length: 5670,
  width: 400,
  path: [[0, 0], [-128, -48], [-460, -168], [-908, -308], [-1384, -424], [-1800, -472],
    [-2216, -424], [-2692, -308], [-3140, -168], [-3472, -48], [-3600, 0]] as [number, number][],
};

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

// the way a rolling stone rolls (in blender): along the game's x, which is
// across the map, blender +x unturned, turning with the level as the camera does
const ROLLINGS: Vec3[] = [[1, 0, 0], [0, -1, 0], [-1, 0, 0], [0, 1, 0]];

export function stoneRolling(turn: number): Vec3 {
  const quarters = Math.round(turn / 90);
  return ROLLINGS[((quarters % 4) + 4) % 4];
}

// how far to turn an enemy's model about the viewport's y, so its front (+z) faces
// the player, back along the camera's facing; its side (+x) is then across the map
export function enemyTurn(turn: number): number {
  const [facingX, , facingZ] = blenderToView(cameraFacing(turn));
  return Math.atan2(-facingX, -facingZ) + 0; // + 0 turns -0 into 0
}

// how far to turn an enemy's model about the viewport's y, so its front (+z)
// faces level from one place (in blender) towards another: the way a turtle
// walks. facing the player (at the level's turn) if they're in one place
export function facingFrom(from: Vec3, to: Vec3, turn = 0): number {
  const [x, , z] = blenderToView([to[0] - from[0], to[1] - from[1], 0]);
  if (Math.hypot(x, z) < 1e-9) {
    return enemyTurn(turn);
  }
  return Math.atan2(x, z) + 0; // + 0 turns -0 into 0
}

// the middle of a rolling stone at each point of its path (in blender), for a
// stone at at, raised by raise: jungle rollers' path, its middle a stone's radius
// over the track's floor, which stands a box's height over the stone's spot, across the map
export function stonePath(at: Vec3, raise: number, turn: number, scale: number): Vec3[] {
  const [rollX, rollY] = stoneRolling(turn);
  const [middleAlong, middleUp] = STONE_TRACK.path[Math.floor(STONE_TRACK.path.length / 2)];
  return STONE_TRACK.path.map(([along, up]) => {
    const across = (along - middleAlong) / scale;
    const height = (up - middleUp + STONE_TRACK.radius + STONE_TRACK.lift) / scale;
    return [at[0] + rollX * across, at[1] + rollY * across, at[2] + raise + height] as Vec3;
  });
}

// up the creek's fish's leap (its first fish's path), in game units from its
// spot: across the map (as a stone rolls) and up. it leaps out along it and back
export const FISH_LEAP: [number, number][] = [
  [0, 0], [0, 36], [0, 208], [0, 604], [228, 1404], [460, 1932], [688, 2172],
  [916, 2172], [1144, 1932], [1372, 1400], [1600, 600], [1600, 224], [1600, 44], [1600, 0],
];

// which way along the game's x a fish leaps: on (1), or back (-1) reversed
export function leapWay(reverse: boolean): number {
  if (reverse) {
    return -1;
  }
  return 1;
}

const scaled = ([x, y, z]: Vec3, factor: number): Vec3 => [x * factor, y * factor, z * factor];

// each point of a fish's leap (in blender), for a fish at at, raised by raise;
// reversed, it leaps the other way across the map
export function fishLeap(at: Vec3, raise: number, turn: number, scale: number, reverse = false): Vec3[] {
  const [rollX, rollY] = scaled(stoneRolling(turn), leapWay(reverse));
  return FISH_LEAP.map(([across, up]) =>
    [at[0] + (rollX * across) / scale, at[1] + (rollY * across) / scale, at[2] + raise + up / scale] as Vec3);
}

// temple ruins' bats' swoop (its first roost's path), in game units from the
// roost: along the game's z (the route back towards the spawn) and up. its bats fly it once
export const BAT_SWOOP: [number, number][] = [
  [0, 0], [772, -776], [1540, -1200], [2308, -1200], [3076, -1200], [3848, -1200], [4616, -1200],
  [5384, -1200], [6156, -1336], [6924, -1300], [7692, -1236], [8464, -1200], [9232, -776], [10000, 0],
];

// how high a bat roost goes over the floor, in game units: its bats' spot comes
// down to 600 over it at the swoop's lowest, so they fly at crash, their bodies
// (Ba1sG reaches 361 below its spot) clear of the floor
export const BAT_ROOST_HEIGHT = 600 - Math.min(...BAT_SWOOP.map(([, up]) => up));

// each point of a bat roost's swoop (in blender), for a roost at at, raised by
// raise: back along the way the camera faces, towards the spawn
export function batSwoop(at: Vec3, raise: number, turn: number, scale: number): Vec3[] {
  const [wayX, wayY] = scaled(cameraFacing(turn), -1);
  return BAT_SWOOP.map(([along, up]) =>
    [at[0] + (wayX * along) / scale, at[1] + (wayY * along) / scale, at[2] + raise + up / scale] as Vec3);
}

// how far a crab walks back and forth, in game units: n. sanity beach's first
// crab's path, a straight line along the game's x (its default path, src/enemyPaths.ts)
export const CRAB_WALK = 1600;

// how far a turtle walks back and forth, in game units: n. sanity beach's first
// turtle's path, along the game's z (the route), straightened (its default path, src/enemyPaths.ts)
export const TURTLE_WALK = 2000;

// how far a native walks back and forth, in game units: the great gate's
// natives' path, a straight line along the game's x (its default path, src/enemyPaths.ts)
export const NATIVE_WALK = 1972;

// how far badgers run, in game units: jungle rollers' first badger spawner's
// path, along the game's z (the route), straightened (its default path, src/enemyPaths.ts)
export const BADGER_RUN = 5200;

// how far a warthog charges back and forth, in game units: road to nowhere's
// warthogs' path, along the game's z (the route) (its default path, src/enemyPaths.ts)
export const WARTHOG_RUN = 5200;

// how far walking spiders run, in game units: fumbling in the dark's shortest
// walking spider path, along the game's z (the route) (its default path, src/enemyPaths.ts)
export const WALKING_SPIDER_RUN = 3200;

// how far a monkey walks back and forth, in game units: the great gate's monkeys'
// path, a straight line along the game's x (its default path, src/enemyPaths.ts)
export const MONKEY_WALK = 2400;

// a box's size in blender metres, for a level at scale game units a metre
export function boxSize(scale: number): number {
  return BOX_UNITS / scale;
}

// the middles (in blender) of a stack of boxes standing at at, raised by raise
export function stackCentres(at: Vec3, raise: number, stack: number, scale: number): Vec3[] {
  const size = boxSize(scale);
  return Array.from({ length: stack }, (_, k) => [at[0], at[1], at[2] + raise + size * k + size / 2] as Vec3);
}
