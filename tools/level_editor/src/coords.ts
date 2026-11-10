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

// straight up (in blender), however the level is turned
export const rising = (): Vec3 => [0, 0, 1];

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

// which way a lab assistant throws its vials (in blender): back along the
// game's x, across the map the other way from a rolling stone. its throw (and
// so which way it faces) comes from its init flag c, picking one of its code's
// throws, and every throw a custom level gets (not stormy ascent's other set) goes that way
export const labAssistantThrow = (turn: number): Vec3 =>
  scaled(stoneRolling(turn), -1).map((value) => value + 0) as Vec3; // + 0 turns -0 into 0

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

const BAT_SWOOP_LENGTH = BAT_SWOOP[BAT_SWOOP.length - 1][0];

// where a bat roost's swoop ends by default (in blender), from the roost: as
// temple ruins', back along the way the camera faces, towards the spawn
export const batSwoopEnd = (turn: number, scale: number): Vec3 => scaled(cameraFacing(turn), -BAT_SWOOP_LENGTH / scale);

// temple ruins' swoop with each step split into pieces, evenly
function splitSwoop(pieces: number): [number, number][] {
  const split = BAT_SWOOP.slice(1).flatMap(([along, up], step) => {
    const [fromAlong, fromUp] = BAT_SWOOP[step];
    return Array.from({ length: pieces }, (_, piece): [number, number] => {
      const share = (piece + 1) / pieces;
      return [fromAlong + (along - fromAlong) * share, fromUp + (up - fromUp) * share];
    });
  });
  return [BAT_SWOOP[0], ...split];
}

// each point of a bat roost's swoop (in blender), from the roost to its end:
// temple ruins' (its dip and wobble kept), stretched and turned to reach the
// end and rising or falling to it, each step split into as many pieces as it's
// stretched, so its points stay about as far apart as temple ruins'
export function batSwoop(roost: Vec3, end: Vec3, turn: number, scale: number): Vec3[] {
  const way = flatWay(roost, end, scaled(cameraFacing(turn), -1));
  const stretch = (Math.hypot(end[0] - roost[0], end[1] - roost[1]) * scale) / BAT_SWOOP_LENGTH;
  const rise = end[2] - roost[2];
  return splitSwoop(Math.max(1, Math.round(stretch))).map(([along, up]) => [
    roost[0] + (way[0] * along * stretch) / scale,
    roost[1] + (way[1] * along * stretch) / scale,
    roost[2] + up / scale + (rise * along) / BAT_SWOOP_LENGTH,
  ] as Vec3);
}

// sunset vista's leader bats' flight (its first roost's path), in game units
// from the roost: along the game's x (back across the map) and up. its bats fly it once
export const LEADER_BATS_FLIGHT: [number, number][] = [
  [0, 0], [-56, -748], [-288, -1412], [-800, -1700], [-1600, -1700], [-2400, -1700], [-3200, -1700],
  [-4000, -1700], [-4800, -1700], [-5600, -1700], [-6116, -1412], [-6348, -748], [-6400, 0],
];

// how high new leader bats' first leader goes over the floor, in game units:
// where crash can spin it, and the bats fly at him
export const LEADER_BAT_HEIGHT = 600;

// how far apart sunset vista's first leader bats are, in game units, along
// their flight (200 and 6200 along it): the second leader's default gap from the first
export const LEADER_BATS_GAP = 6000;

const FIRST_LEADER_ACROSS = -200; // where sunset vista's first leader is along its flight
// how far below the roost the bats fly past the leaders, at the leaders'
// height (sunset vista's leaders are 800 down, over ledges crash reaches them
// from; here they're at the flight's lowest, so he can spin them on flat ground)
const FLIGHT_LOWEST = -1700;
const FLIGHT_BEHIND = 400;        // how far behind the leaders (away from the camera) the bats fly
const FLIGHT_STEP = 800;          // how far apart the flight's points are, past the leaders, at most

// sunset vista's bats' dive down to the first leader, and their climb up
// away from the second: along the flight from that leader, and up from it
const toFirstLeader = ([across, up]: [number, number]): [number, number] => [FIRST_LEADER_ACROSS - across, up - FLIGHT_LOWEST];
const toSecondLeader = ([across, up]: [number, number]): [number, number] => [FIRST_LEADER_ACROSS - LEADER_BATS_GAP - across, up - FLIGHT_LOWEST];
const LEADER_BATS_DIVE = LEADER_BATS_FLIGHT.slice(0, 3).map(toFirstLeader);
const LEADER_BATS_CLIMB = LEADER_BATS_FLIGHT.slice(-3).map(toSecondLeader);
const DOWN_FROM_LEADER = toFirstLeader(LEADER_BATS_FLIGHT[3])[0]; // how far past the first leader (and before the second) the bats are down

// where the second leader goes by default (in blender), from the first: back
// across the map, the other way from a rolling stone
export const leaderBatsGap = (turn: number, scale: number): Vec3 => scaled(stoneRolling(turn), -LEADER_BATS_GAP / scale);

// how far along the flight the bats fly down at the leaders' height, from the
// first leader (game units), for leaders distance apart: in even steps from
// just past the first to just before the second, or between them at their
// middle when they're closer than that
function flightRun(distance: number): number[] {
  const [start, end] = [DOWN_FROM_LEADER, distance - DOWN_FROM_LEADER];
  if (end <= start) {
    return [distance / 2];
  }
  const steps = Math.ceil((end - start) / FLIGHT_STEP);
  return Array.from({ length: steps + 1 }, (_, step) => start + ((end - start) * step) / steps);
}

// which way it is, flat, from one point to another: fallback with one right over the other
function flatWay(from: Vec3, to: Vec3, fallback: Vec3): Vec3 {
  const [x, y] = [to[0] - from[0], to[1] - from[1]];
  const length = Math.hypot(x, y);
  if (length === 0) {
    return fallback;
  }
  return [x / length, y / length, 0];
}

// leader bats' flight (in blender), between their leaders: as sunset vista's
// bats, from high over the first and a little before it, down past it, on to
// the second (rising or falling as the leaders are), and up away past it, all
// a little behind the leaders. its first point is where the roost is
export function leaderBatsFlight(first: Vec3, second: Vec3, turn: number, scale: number): Vec3[] {
  const way = flatWay(first, second, scaled(stoneRolling(turn), -1)); // back across the map, as by default, with the leaders one over the other
  const distance = Math.hypot(second[0] - first[0], second[1] - first[1]) * scale;
  const behind = scaled(cameraFacing(turn), -FLIGHT_BEHIND / scale);
  const pointAt = ([along, up]: [number, number]): Vec3 => {
    const share = Math.min(1, Math.max(0, along / Math.max(distance, 1)));
    const height = first[2] + (second[2] - first[2]) * share;
    return [first[0] + (way[0] * along) / scale + behind[0], first[1] + (way[1] * along) / scale + behind[1], height + up / scale];
  };
  const run = flightRun(distance).map((along): [number, number] => [along, 0]);
  const climb = LEADER_BATS_CLIMB.map(([along, up]): [number, number] => [distance + along, up]);
  return [...LEADER_BATS_DIVE, ...run, ...climb].map(pointAt);
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

// how far lizards go back and forth, in game units: the lost city's green
// lizards' longest path, which they leap along, and its red lizards' shorter
// one's points, which they hop along, each a straight line along the game's x
// (their default paths, src/enemyPaths.ts)
export const LIZARD_LEAPS = 3200;
export const RED_LIZARD_HOPS = 4800;
// how far a walking lizard paces back and forth, in game units: the lost city's
// walking lizards' paths, 3 points 400 apart along the game's x
export const WALKING_LIZARD_PACE = 800;

// how far a robot dog walks back and forth, in game units: heavy machinery's
// robot dogs' longest path, a straight line along the game's x there, the way
// crash runs in that side-on level (its default path, src/enemyPaths.ts)
export const ROBOT_DOG_WALK = 1600;

// how far a barrel roller's barrels roll, in game units: toxic waste's first
// barrel roller's path, from him back along the walkway towards crash's start,
// a straight line there (its default path, src/enemyPaths.ts)
export const BARREL_ROLL = 4800;

// how far a camera robot rises and falls, in game units: castle machinery's camera
// robots' paths, straight up and down its shafts (its default path, src/enemyPaths.ts)
export const CAMERA_ROBOT_RISE = 1200;

// how far a bird swoops up and down, in game units: slippery climb's birds' paths,
// straight up and down beside its climb (its default path, src/enemyPaths.ts)
export const BIRD_SWOOP = 1200;

// how far an electric scientist walks, in game units: the lab's walking lab
// assistants' paths, back along the route towards crash's start (its default path, src/enemyPaths.ts)
export const SCIENTIST_WALK = 4800;

// how far a blob hops, in game units: the lab's blob spawners' paths, 13 steps
// of 400 from where its blobs come out back towards crash's start, a straight
// line there (its default path, src/enemyPaths.ts)
export const BLOB_HOP = 5200;

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
