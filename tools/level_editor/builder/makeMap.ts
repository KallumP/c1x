// a custom level from a map modelled in blender (its .obj's text): its faces
// as the level's world meshes and collision, crash, and the objects placed in
// it; built from a real level (the base level) for crash, the objects and
// textures. faces of materials with an image get it, the rest the base level's textures
import { batSwoop, leafDriftShares, leaderBatsFlight, leapWay, pillarSlideShares } from "../src/coords";
import { inEvenSteps, pathPositions, pathStep, pointAlongShare, spotAndNode } from "../src/enemyPaths";
import { hasPath, LEADER_BATS_LEADERS, numberSetting, pegCount, GATES, ROTATING_OBSTACLES, TIMED_OBSTACLES, type EnemyType, type LevelObject, type PathEnemy, type ObstacleType } from "../src/objects";
import { throwFlags } from "../src/labAssistantThrow";
import { DEFAULT_SKY, type Sky } from "../src/sky";
import { assembleLevel, MAP_CELL, type ZonePlan } from "./assembleLevel";
import { addFloor, Cells, solidCells } from "./collision";
import { EntryTooBig } from "./cutLevel";
import { objectDonorLevels, objectDonorObjects } from "./donorObjects";
import {
  BOX_HEIGHT, BOX_TYPE, donorEntityType, donorObstacleType, entityPath, ENTITY_INIT_FLAGS, ENEMY_ENTITIES, entityId, linkSwitches, newEntityIds, stoneStartFlag, UNBREAKABLE_BOXES, withInitFlagA, withInitFlagC,
  LEADER_BAT, OBSTACLE_ENTITIES, SLAMMING_WALL_LEFT, withNoRotationFromFlags, WARP_PAD, withEntityId, withEntityType, withInitFlagB, withPath, withPathFrom, withPosition, withSubtype, type PlacedBox,
} from "./entities";
import { fit, zoneCells, zoneSpans, type Fit, type Span } from "./fit";
import type { RgbImage } from "./images";
import { ENTRY_SLST, type Level } from "./levelFiles";
import { boxInitFlagB, boxSubtype, toZone } from "./levelObjects";
import { addMapPiece, TEXINFO_WORDS_MAX, textureWorlds } from "./mapTextures";
import { readObj, type Mesh } from "./obj";
import { LEAF_FLOOR, LEAF_GROUND, LEAF_PIT, type Block } from "./octree";
import { roundHalfToEven } from "./pyMath";
import { cameraOffsets, cameraPath, spawnPoint, zoneIndex, zonePaths } from "./route";
import { DEFAULT_CAMERA, type Camera } from "../src/camera";
import { mossySlidePath } from "./mossySlide";
import { levelEntity, pieceMesh, readTemplates, STONE_TRACK_LIFT, stoneTrack, warpPadBase, withLongerSkirts, type MapPiece, type StoneTrack, type Templates } from "./templates";
import type { Vec3 } from "./vectors";
import { readWorldHeader } from "./worldGeometry";
import { WORLDS_MAX, worldMeshes, type WorldMesh } from "./worldMeshes";
import { soundtrackMusic, withMusic, type LevelMusic } from "./music";
import { withSky } from "./zones";

export { LID_TEST } from "./assembleLevel";

export const MAP_SCALE = 400;     // zone units per blender metre: crash is about 665 tall (his bound in
                                  // StopAtFloor in src/solid.c), so 1.7 m
const MAP_PIECE = 512;            // the world meshes are sliced along z this often
const MAP_TILE = 1024;            // and along x and y this often, so textures don't stretch over whole faces
const MAP_PATH_STEP = 128;        // camera path points; doubled while the sort list doesn't fit in a page
const MAP_HEADROOM = 1024;        // room above the map
const CRASH_LIFT = 100;           // crash starts this far above where he's put

export interface MapOptions {
  scale?: number;
  turn?: number;
  images?: Map<string, RgbImage>; // each material's image
  objects?: LevelObject[];
  sky?: Sky;                      // n. sanity beach's without one
  camera?: Camera;                // how the follow camera looks at crash; as it always was without one
  readOtherLevel?: (lid: number) => Level; // the real levels enemies are taken from (see OBJECT_DONORS)
  music?: string;                 // one of the soundtracks (src/music.ts); jungle rollers' without one
}

// collision blocks for cells
export function cellBlocks(cells: Cells, cell: number): Block[] {
  const leaves = { floor: LEAF_FLOOR, wall: LEAF_GROUND, pit: LEAF_PIT };
  return [...cells].map(({ at, kind }) => ({
    low: at.map((index) => index * cell) as Vec3,
    high: at.map((index) => (index + 1) * cell) as Vec3,
    leaf: leaves[kind],
  }));
}

// the map, fitted into zones, with its collision
interface FittedMap {
  fitted: Fit;
  spans: Span[];
}

// each zone's world meshes; with more than one zone, each lists the next's too,
// so half as many. a zone with rolling stones (trackZones) ends with an empty
// one, kept for their tracks, so they fit however full the map's meshes are
function zoneWorldMeshes({ fitted, spans }: FittedMap, templates: Templates, textured: Set<string>, trackZones: Set<number>): WorldMesh[][] {
  const texinfoWords = readWorldHeader(templates.world.items[0]).texinfoWords;
  const options = {
    piece: MAP_PIECE,
    ground: templates.textures[0],
    side: templates.textures[1],
    tile: MAP_TILE,
    textured,
    regionsMax: Math.floor((TEXINFO_WORDS_MAX - texinfoWords) / 2),
    worldsMax: spans.length === 1 ? WORLDS_MAX : WORLDS_MAX / 2,
  };
  return spans.map((span, zone) => {
    if (!trackZones.has(zone)) {
      return worldMeshes(fitted.mesh, { ...options, span });
    }
    return [...worldMeshes(fitted.mesh, { ...options, span, worldsMax: options.worldsMax - 1 }), { vertices: [], polygons: [] }];
  });
}

// the enemies placed as an invisible spawner that sends them out along its path,
// and how far below its last point they go down out of sight, in game units: as
// far as the last points of jungle rollers' badger spawners' paths drop (1112 to
// 1220), and fumbling in the dark's spider spawners'
const SPAWNER_DROPS: Partial<Record<EnemyType, number>> = { badger: 1160, walking_spider: 1600 };

// a spawner's path with the point its enemies go down to after its last
function withDrop(run: Vec3[], drop: number): Vec3[] {
  const [x, y, z] = run[run.length - 1];
  return [...run, [x, y - drop, z]];
}

// a spawner running run: its enemies go down out of sight at the end, and its
// init flag c is how many come out at once
function asSpawner(entity: Buffer, enemy: LevelObject, run: Vec3[], drop: number): Buffer {
  return withInitFlagC(withPath(entity, withDrop(run, drop)), numberSetting(enemy, "count"));
}

// the enemies the game starts at the far end of their path (the great gate's
// monkey, by its script, in a custom level), whose paths go into the level the
// other way round, so they start at the editor's first node as the rest do
const STARTS_AT_FAR_END: EnemyType[] = ["monkey"];

// how far down below its last node the path goes for the enemies the game sinks
// out of sight at its end, in game units: the lab's blobs, into the floor (its
// blob spawners' paths' last points are 800 below the rest)
const SINKING_DROPS: Partial<Record<EnemyType, number>> = { blob: 800 };

// a path enemy's entity running run (a badger or walking spider as its spawner)
function pathEnemyEntity(entity: Buffer, enemy: LevelObject, run: Vec3[]): Buffer {
  const drop = SPAWNER_DROPS[enemy.enemy!];
  if (drop !== undefined) {
    return asSpawner(entity, enemy, run, drop);
  }
  const sinking = SINKING_DROPS[enemy.enemy!];
  if (sinking !== undefined) {
    return withPath(entity, withDrop(run, sinking));
  }
  if (STARTS_AT_FAR_END.includes(enemy.enemy!)) {
    return withPath(entity, [...run].reverse());
  }
  return withPath(entity, run);
}

// the enemies that move along their own level's path, moved to their spot: up
// the creek's fish, leaping
const OWN_PATH_ENEMIES: EnemyType[] = ["fish"];

const FRAMES_A_SECOND = 30; // the game's clock (frames_elapsed), as a bat roost counts its delay

// a bat roost's entity with its settings: its init flag a how many bats it
// sends, and b the frames between its flocks (counted from when one starts;
// c, the wait before its first, is left as it was)
function roostEntity(entity: Buffer, enemy: LevelObject): Buffer {
  const withCount = withInitFlagA(entity, numberSetting(enemy, "count"));
  return withInitFlagB(withCount, Math.round(numberSetting(enemy, "delay") * FRAMES_A_SECOND));
}

// a bat roost as temple ruins' are, made from sunset vista's (which the bats
// come from, and which has none of them): subtype 9, which waits for crash to
// come along the route, and the wait before its first flock (flag c) the
// default. its path (its swoop), count and delay are set where it's placed
function batRoostExample(donor: Level): Buffer {
  const roost = withInitFlagC(withInitFlagB(levelEntity(donor, ...ENEMY_ENTITIES.leader_bats), 0), 0);
  return withSubtype(roost, ENEMY_ENTITIES.bat[1]);
}

// a gunman as cortex power's are, without its first's link (its init flag a, the
// entity id of an object there it reacts to)
function gunmanExample(donor: Level): Buffer {
  return withInitFlagA(donorEnemyEntity(donor, "gunman"), 0);
}

const INIT_FLAG_MAX = 32767; // an entity's init flags are 16 bits, signed

// a gunman's entity with his range (how near crash comes before he shoots) in
// his init flag c, in game units: his code is patched to read it there
function gunmanEntity(entity: Buffer, enemy: LevelObject, scale: number): Buffer {
  const range = Math.round(numberSetting(enemy, "range") * scale);
  return withInitFlagC(entity, Math.min(range, INIT_FLAG_MAX));
}

// an enemy's entity from the level it's taken from, of its type in custom levels
// (another than its own if its code moves there: see MOVED_ENEMY_CODE)
function donorEnemyEntity(donor: Level, type: EnemyType): Buffer {
  return withEntityType(levelEntity(donor, ...donorEntityType(type)), ENEMY_ENTITIES[type][0]);
}

// an obstacle's entity from the level it's taken from, of its type in custom
// levels (another than its own if its code moves there: see MOVED_ENEMY_CODE)
const obstacleExample = (donor: Level, type: ObstacleType): Buffer =>
  withEntityType(levelEntity(donor, ...donorObstacleType(type)), OBSTACLE_ENTITIES[type][0]);

// slamming walls' left half from temple ruins, moved to the walls' slot as their right half is
const slammingWallLeft = (donor: Level): Buffer =>
  withEntityType(levelEntity(donor, ...SLAMMING_WALL_LEFT), OBSTACLE_ENTITIES.slamming_walls[0]);

// the great gate's spiked logs: a rising one pushes up out of the floor at its
// spot, and a falling one comes down on it from SPIKED_LOG_HANG over it (game
// units, as the great gate's hang over their floor: higher, it stops short of crash)
const SPIKED_LOG_HANG = 1600;

// a spiked log's or fire pit's init flags: A the frames between its pushes or
// flames, and B the frames into them it starts, which brings them that much
// sooner. its offset puts them off, so it starts that much less far into them
function obstacleTiming(obstacle: LevelObject): [number, number] {
  const every = Math.round(numberSetting(obstacle, "every") * FRAMES_A_SECOND);
  const offset = Math.round(numberSetting(obstacle, "offset") * FRAMES_A_SECOND) % every;
  return [every, (every - offset) % every];
}

// the path obstacles that move along their nodes as their own level's first
// eases along its path: a carrying platform's ride, a moving platform's slide
const OWN_EASED_PATHS: ObstacleType[] = ["carrying_platform", "moving_platform", "lift_platform"];

// how far along its own level's path each of a path obstacle's points is: a
// floating leaf's drift's, a sliding pillar's slide's, or a carrying platform's ride's
// length its path's length (game units), example its entity from its own level
function ownPathShares(obstacle: LevelObject, length: number, example: Buffer): number[] {
  if (obstacle.obstacle === "sliding_pillar") {
    return sharesInSteps(pillarSlideShares(), pillarSteps(length));
  }
  if (OWN_EASED_PATHS.includes(obstacle.obstacle!)) {
    return entityPathShares(example);
  }
  return leafDriftShares();
}

// a sliding pillar's steps along its path (length, game units): its own
// level's 13, or more if its longest step (in the middle, where it's eased
// fastest) would be over PILLAR_STEP_MAX, so a long or bent path keeps its
// shape (its speed is its flag A, not its points: see pillarSlideFrames)
const PILLAR_STEP_MAX = 400;
function pillarSteps(length: number): number {
  const shares = pillarSlideShares();
  const ownSteps = shares.length - 1;
  const longest = Math.max(...shares.slice(1).map((share, step) => share - shares[step])) * ownSteps; // its longest step, in average steps
  return Math.max(ownSteps, Math.ceil((length * longest) / PILLAR_STEP_MAX));
}

// shares (how far along a path each point is) in steps steps, each as far
// along as the eased path (shares) is by then
function sharesInSteps(shares: number[], steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, point) => shareAt(shares, (point * (shares.length - 1)) / steps));
}

// a sliding pillar's init flag A: the frames its slide there and back takes at
// its speed (metres a second), its path length game units long at scale
const INIT_FLAG_FRAMES_MAX = 32767;
function pillarSlideFrames(pillar: LevelObject, length: number, scale: number): number {
  const seconds = (2 * length) / scale / numberSetting(pillar, "speed");
  return Math.min(INIT_FLAG_FRAMES_MAX, Math.max(1, Math.round(seconds * FRAMES_A_SECOND)));
}

// a rising pillar's init flags: A the frames its rise and fall takes, B how far
// through it the pillar is, in 256ths ahead (temple ruins' code), so its offset
// puts it behind
const CYCLE_SHARES = 256;
function risingPillarTiming(pillar: LevelObject): [number, number] {
  const [every, into] = obstacleTiming(pillar);
  return [every, Math.round((into * CYCLE_SHARES) / every) % CYCLE_SHARES];
}

// entity with a rising pillar's timing in its init flags, not turned by them;
// any other obstacle's as it is
function withRiseTiming(entity: Buffer, obstacle: LevelObject): Buffer {
  if (obstacle.obstacle !== "rising_pillar") {
    return entity;
  }
  const [every, ahead] = risingPillarTiming(obstacle);
  return withInitFlagB(withInitFlagA(withNoRotationFromFlags(entity), every), ahead);
}

// the obstacles whose init flag A is the frames their slide there and back
// takes, at their speed: a sliding pillar, and a moving platform (temple ruins'
// code, as slippery climb has it)
const SLIDING_AT_SPEED: ObstacleType[] = ["sliding_pillar", "moving_platform"];

// entity with a sliding pillar's or moving platform's slide's frames in its
// init flag A, not turned by it; any other obstacle's as it is
function withSlideTiming(entity: Buffer, obstacle: LevelObject, length: number, scale: number): Buffer {
  if (!SLIDING_AT_SPEED.includes(obstacle.obstacle!)) {
    return entity;
  }
  const timed = withInitFlagA(withNoRotationFromFlags(entity), pillarSlideFrames(obstacle, length, scale));
  return withSlideStart(timed, obstacle);
}

// a moving platform's code puts it |A/2 - (frames + B's share of A) % A| along
// its path, so its init flag B half way round (in 256ths) starts it at its
// first node, where the editor shows it (slippery climb's are a quarter or more
// round); any other obstacle's as it is
const HALF_WAY_ROUND = CYCLE_SHARES / 2;
function withSlideStart(entity: Buffer, obstacle: LevelObject): Buffer {
  if (obstacle.obstacle !== "moving_platform") {
    return entity;
  }
  return withInitFlagB(entity, HALF_WAY_ROUND);
}

// a carrying platform's init flag A: its step along its path a frame, in
// 256ths of a point (temple ruins' code), so its points' steps take the frames
// its path length game units long at scale takes at its speed (metres a second)
const POINT_SHARES = 256;
function platformRideStep(platform: LevelObject, points: number, length: number, scale: number): number {
  const frames = (length / scale / numberSetting(platform, "speed")) * FRAMES_A_SECOND;
  return Math.min(INIT_FLAG_FRAMES_MAX, Math.max(1, Math.round(((points - 1) * POINT_SHARES) / frames)));
}

// entity with a carrying platform's step along its points points in its init
// flag A, not turned by it; any other obstacle's as it is
// the obstacles whose init flag A is their step along their points a frame
// (temple ruins' code): a carrying platform, and a lift platform (slippery climb's)
const STEPPING_AT_SPEED: ObstacleType[] = ["carrying_platform", "lift_platform"];

function withRideSpeed(entity: Buffer, obstacle: LevelObject, points: number, length: number, scale: number): Buffer {
  if (!STEPPING_AT_SPEED.includes(obstacle.obstacle!)) {
    return entity;
  }
  return withInitFlagA(withNoRotationFromFlags(entity), platformRideStep(obstacle, points, length, scale));
}

// entity with a dropping platform's timing in its init flags (A the frames it
// shakes before it drops, B the frames it stays dropped), not turned by them;
// any other obstacle's as it is
function withDropTiming(entity: Buffer, obstacle: LevelObject): Buffer {
  if (obstacle.obstacle !== "dropping_platform") {
    return entity;
  }
  const shake = Math.round(numberSetting(obstacle, "shake") * FRAMES_A_SECOND);
  const down = Math.round(numberSetting(obstacle, "down") * FRAMES_A_SECOND);
  return withInitFlagB(withInitFlagA(withNoRotationFromFlags(entity), shake), down);
}

// entity with a timed plank's wait once crash stands on it before it breaks
// (its delay, in frames) in its init flag A, not turned by it; any other's as it is
function withBreakDelay(entity: Buffer, object: LevelObject): Buffer {
  if (object.obstacle !== "timed_plank") {
    return entity;
  }
  return withInitFlagA(withNoRotationFromFlags(entity), Math.round(numberSetting(object, "delay") * FRAMES_A_SECOND));
}

// rotating pegs' init flags (temple ruins' code): A their radius in 400s of
// game units, B their turn in degrees a second (less than 0 the way temple
// ruins' first goes), C its preset for how many go round
const PEG_RADIUS_UNIT = 400;
const PEG_PRESETS: Record<number, number> = { 4: 10, 5: 0, 8: 11, 9: 1 };
function pegFlags(pegs: LevelObject, scale: number): [number, number, number] {
  const radius = Math.max(1, Math.round((numberSetting(pegs, "radius") * scale) / PEG_RADIUS_UNIT));
  const turn = Math.round(360 / numberSetting(pegs, "every"));
  return [radius, pegs.reverse ? turn : -turn, PEG_PRESETS[pegCount(pegs)]];
}

// entity with rotating pegs' flags, not turned by them; any other obstacle's as it is
function withPegTurn(entity: Buffer, obstacle: LevelObject, scale: number): Buffer {
  if (obstacle.obstacle !== "rotating_pegs") {
    return entity;
  }
  const [radius, turn, preset] = pegFlags(obstacle, scale);
  return withInitFlagC(withInitFlagB(withInitFlagA(withNoRotationFromFlags(entity), radius), turn), preset);
}

// a floor fire's init flag B: the frames each of its flames waits from its
// last before it bursts again (sunset vista's code); a steady fire's 1, so it
// bursts again at once
const STEADY_FIRE_WAIT = 1;
function fireWait(fire: LevelObject): number {
  if (fire.obstacle === "steady_fire") {
    return STEADY_FIRE_WAIT;
  }
  return Math.round(numberSetting(fire, "every") * FRAMES_A_SECOND);
}

// a fire's init flag C, how its flames' hold at full height counts (their code
// patched: see SUNSET_RUINS_CODE_PATCHES): a floor fire's -1 as the game's own
// (about 2 s), a steady fire's 0 for good
const FIRE_HOLDS: Partial<Record<ObstacleType, number>> = { floor_fire: -1, steady_fire: 0 };

// a fire's init flag A: its flames' head start into their first wait, in frames
// (their code patched: see SUNSET_RUINS_CODE_PATCHES), their wait less its
// offset, so they first burst its offset in; 0 without one (the code's huge default: at once)
function fireStart(fire: LevelObject): number {
  const wait = fireWait(fire);
  const offset = Math.round(numberSetting(fire, "offset") * FRAMES_A_SECOND) % wait;
  if (offset === 0) {
    return 0;
  }
  return wait - offset;
}

// entity with a floor or steady fire's start, wait and hold in its init flags,
// not turned by them; any other obstacle's as it is
function withFireTiming(entity: Buffer, obstacle: LevelObject): Buffer {
  const hold = FIRE_HOLDS[obstacle.obstacle!];
  if (hold === undefined) {
    return entity;
  }
  const timed = withInitFlagB(withInitFlagA(withNoRotationFromFlags(entity), fireStart(obstacle)), fireWait(obstacle));
  return withInitFlagC(timed, hold);
}

// an object placed from its own level's entity (see placeWithItsPath) with
// its settings in its flags: each of these changes only its own kind of object
type SettingsInFlags = (entity: Buffer, object: LevelObject, scale: number) => Buffer;
const OWN_SETTINGS: SettingsInFlags[] = [withGateTurn, withRiseTiming, withDropTiming, withBreakDelay, withPegTurn, withFireTiming];
const withOwnSettings = (entity: Buffer, object: LevelObject, scale: number) =>
  OWN_SETTINGS.reduce((settled, withSettings) => withSettings(settled, object, scale), entity);

// how long a path through points is
function pathLength(points: Vec3[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(...point.map((value, axis) => value - points[index][axis])), 0);
}

// how far along a path it is at a fractional point (between two of shares)
function shareAt(shares: number[], point: number): number {
  const before = Math.floor(point);
  const after = Math.min(shares.length - 1, before + 1);
  return shares[before] + (shares[after] - shares[before]) * (point - before);
}

// whether an obstacle moves along its nodes (its own path, a sliding pillar's
// two ends, at its speed, or a carrying platform's default), not its own
// level's path as it is
const onItsNodes = (obstacle: LevelObject) => obstacle.path !== undefined || ["sliding_pillar", ...OWN_EASED_PATHS].includes(obstacle.obstacle!);

// a gate's init flags are its turn (its spawn flags let them be): A tips it
// over, B is its yaw, 4096 a full turn, anticlockwise seen from above
const FULL_TURN = 4096;

// entity with a gate's rotation (degrees) as its turn; any other object's as
// it is. the game draws it turned Ry(C) Rx(A) Ry(B - C) (src/pc/gfx/soft.c):
// its turn in B alone stood it turned, but its fall (tipping A over) stayed
// towards the camera; in B and C both, it stands the same and falls the way it faces
function withGateTurn(entity: Buffer, object: LevelObject): Buffer {
  if (!GATES.includes(object.obstacle!)) {
    return entity;
  }
  const turn = Math.round((numberSetting(object, "rotation") / 360) * FULL_TURN) % FULL_TURN;
  return withInitFlagC(withInitFlagB(entity, turn), turn);
}

// a pushing block's init flag C's bit 1 picks its model with a top (Rp7w): its
// level's (all pushing out of walls, their tops hidden) have the one without (Rp1w)
const BLOCK_WITH_TOP = 2;

// entity with a pushing block's top; any other obstacle's as it is
function withBlockTop(entity: Buffer, obstacle: LevelObject): Buffer {
  if (obstacle.obstacle !== "pushing_block") {
    return entity;
  }
  return withInitFlagC(entity, entity.readInt16LE(ENTITY_INIT_FLAGS + 4) | BLOCK_WITH_TOP);
}

// a pushing platform's init flag C's bit 0 picks its long slab (Rw3w: sunset
// vista's first has it set) over its short one (Rw1w)
const PLATFORM_LONG = 1;

// entity with a short pushing platform's short slab; any other obstacle's as it is
function withShortSlab(entity: Buffer, obstacle: LevelObject): Buffer {
  if (obstacle.obstacle !== "short_pushing_platform") {
    return entity;
  }
  return withInitFlagC(entity, entity.readInt16LE(ENTITY_INIT_FLAGS + 4) & ~PLATFORM_LONG);
}

// how far along its path (0 to 1) each of an entity's points is
function entityPathShares(entity: Buffer): number[] {
  const path = entityPath(entity);
  const steps = path.slice(1).map((point, index) => Math.hypot(...point.map((value, axis) => value - path[index][axis])));
  const total = steps.reduce((sum, step) => sum + step, 0);
  let travelled = 0;
  return [0, ...steps.map((step) => {
    travelled += step;
    return travelled / total;
  })];
}

// a rotating obstacle's init flag C: how many go round (bits 12 to 14), the
// other way round (bit 11), and how far out (bits 0 to 9, in 4s of game units)
const ROTATING_COUNT_SHIFT = 12;
const ROTATING_REVERSE_BIT = 1 << 11;
const ROTATING_RADIUS_UNIT = 4;
const ROTATING_RADIUS_MAX_UNITS = 0x3ff;

// entity with a rotating obstacle's platforms, way round and radius in its
// init flag C; any other obstacle's as it is
function withRotation(entity: Buffer, obstacle: LevelObject, scale: number): Buffer {
  if (!ROTATING_OBSTACLES.includes(obstacle.obstacle!)) {
    return entity;
  }
  const radius = Math.min(ROTATING_RADIUS_MAX_UNITS, Math.round((numberSetting(obstacle, "radius") * scale) / ROTATING_RADIUS_UNIT));
  const count = numberSetting(obstacle, "platforms") << ROTATING_COUNT_SHIFT;
  return withInitFlagC(entity, count | reverseBit(obstacle) | radius);
}

// a rotating obstacle's bit for going the other way round
function reverseBit(obstacle: LevelObject): number {
  if (obstacle.reverse) {
    return ROTATING_REVERSE_BIT;
  }
  return 0;
}

// how far either side of their spot temple ruins' slamming walls' halves
// start, across the map (game units): each slides in this far to meet there
const SLAMMING_WALL_GAP = 1200;

// how far over its spot a timed obstacle is placed
function timedObstacleHang(obstacle: LevelObject): number {
  if (obstacle.obstacle === "falling_spiked_log") {
    return SPIKED_LOG_HANG;
  }
  return 0;
}

// a mossy slide's slider's path along its slope, as long (metres, at scale) and steep as it's set
const slidePath = (slide: LevelObject, scale: number) =>
  mossySlidePath(numberSetting(slide, "length") * scale, numberSetting(slide, "angle"), numberSetting(slide, "rotation"));

// entities each enemy takes: a leader bats roost and its two leaders, one for the rest
function entitiesFor(enemy: LevelObject): number {
  if (enemy.enemy === "leader_bats") {
    return 1 + LEADER_BATS_LEADERS;
  }
  return 1;
}

// entities each obstacle takes: slamming walls' two halves, one for the rest
function entitiesForObstacle(obstacle: LevelObject): number {
  if (obstacle.obstacle === "slamming_walls") {
    return 2;
  }
  return 1;
}

// the enemies that stay at their spot: jungle rollers' plant, up the creek's two
// river plants, the spider hanging there and temple ruins' cobra (and cortex
// power's gunman, with his range)
const STANDING_ENEMIES: EnemyType[] = ["plant", "blue_river_plant", "green_river_plant", "spider", "snake"];

// places objects in the level: where they are in it, which zone they're in, and their entities
class ObjectPlacer {
  readonly entities: Buffer[][];
  readonly placedBoxes: PlacedBox[] = [];
  private ids: number[];

  constructor(private map: FittedMap, private templates: Templates, private scale: number, private turn: number, idsNeeded: number) {
    this.entities = map.spans.map(() => []);
    this.ids = newEntityIds(idsNeeded, new Set([entityId(templates.crash)]));
  }

  // where an object goes in the level: at, raised, as the editor shows it
  positionOf(object: LevelObject): Vec3 {
    const [x, y, z] = toZone(object.at, this.scale, this.turn, this.map.fitted.offset);
    return [roundHalfToEven(x), roundHalfToEven(y + object.raise * this.scale), roundHalfToEven(z)];
  }

  // the zone a position is in, and the position relative to it
  private inZone([x, y, z]: Vec3): { zone: number; at: Vec3 } {
    const zone = zoneIndex(this.map.spans, z);
    return { zone, at: [x, y, z - this.map.spans[zone][0]] };
  }

  placeCrash(start: Vec3): number {
    const { zone, at: [x, y, z] } = this.inZone(start);
    this.entities[zone].push(withPosition(this.templates.crash, [x, y + CRASH_LIFT, z])); // first, where the level spawns
    return zone;
  }

  // a stack of boxes, one after another so the game stacks them. the game draws
  // a box half a box along +x and +z from where it's kept (seen in game), so
  // it's kept that far back for its middle to be at at
  placeBoxStack(object: LevelObject): void {
    const [x, y, z] = this.positionOf(object);
    const { zone, at } = this.inZone([x - BOX_HEIGHT / 2, y, z - BOX_HEIGHT / 2]);
    const subtype = boxSubtype(object);
    for (let k = 0; k < object.stack; k++) {
      const id = this.ids.shift()!;
      const box = withInitFlagB(withEntityId(this.templates.entity(BOX_TYPE, subtype), id), boxInitFlagB(object));
      this.placedBoxes.push({ subtype, zone, index: this.entities[zone].length, id });
      this.entities[zone].push(withPosition(box, [at[0], at[1] + k * BOX_HEIGHT, at[2]]));
    }
  }

  // an enemy that stays at its spot (a plant or spider), as example, in the zone it's in
  placeAtSpot(enemy: LevelObject, example: Buffer): void {
    const { zone, at } = this.inZone(this.positionOf(enemy));
    this.entities[zone].push(withPosition(withEntityId(example, this.ids.shift()!), at));
  }

  // cortex power's gunman (example) at his spot, shooting once crash comes within his range
  placeGunman(enemy: LevelObject, example: Buffer): void {
    this.placeAtSpot(enemy, gunmanEntity(example, enemy, this.scale));
  }

  // stormy ascent's lab assistant (example) at its spot, facing its landing spot
  // (its path's node) and throwing its vials to land there: its init flags
  // its facing and their speeds along x and z (its code is patched to read them)
  placeLabAssistant(enemy: LevelObject, example: Buffer): void {
    const [spot, landing] = spotAndNode(enemy, this.turn, this.scale).map((point) => this.positionOf({ ...enemy, at: point, raise: 0 }));
    const [facing, alongX, alongZ] = throwFlags(spot, landing);
    const { zone, at } = this.inZone(spot);
    const placed = withPosition(withEntityId(example, this.ids.shift()!), at);
    this.entities[zone].push(withInitFlagC(withInitFlagB(withInitFlagA(placed, facing), alongX), alongZ));
  }

  // slamming walls: their right half (right) SLAMMING_WALL_GAP across the map
  // from their spot and their left half (left) as far the other way, each
  // sliding in along its own level's path to meet at the spot
  // both timed by their init flags as a spiked log is (A the frames between slams, B into them)
  placeSlammingWalls(walls: LevelObject, right: Buffer, left: Buffer): void {
    const { zone, at } = this.inZone(this.positionOf(walls));
    const beside = (way: number): Vec3 => [at[0] + way * SLAMMING_WALL_GAP, at[1], at[2]];
    const [every, into] = obstacleTiming(walls);
    const timed = (half: Buffer) => withInitFlagB(withInitFlagA(withNoRotationFromFlags(half), every), into);
    this.entities[zone].push(timed(withPathFrom(withEntityId(right, this.ids.shift()!), beside(1))));
    this.entities[zone].push(timed(withPathFrom(withEntityId(left, this.ids.shift()!), beside(-1))));
  }

  // a spiked log or fire pit (example) at its spot, a falling log hung over it
  // (see SPIKED_LOG_HANG), its init flags its timing (see obstacleTiming)
  placeTimedObstacle(obstacle: LevelObject, example: Buffer): void {
    const { zone, at } = this.inZone(this.positionOf(obstacle));
    const hung: Vec3 = [at[0], at[1] + timedObstacleHang(obstacle), at[2]];
    const [every, into] = obstacleTiming(obstacle);
    const placed = withNoRotationFromFlags(withPosition(withEntityId(example, this.ids.shift()!), hung));
    const timed = withInitFlagB(withInitFlagA(placed, every), into);
    this.entities[zone].push(withRotation(withShortSlab(withBlockTop(timed, obstacle), obstacle), obstacle, this.scale));
  }

  // an enemy or obstacle that moves along its own level's path, as example, from
  // its spot: up the creek's fish, leaping across the map (the other way,
  // reversed), its lily pad sinking and its leaf drifting
  placeWithItsPath(object: LevelObject, example: Buffer): void {
    const { zone, at } = this.inZone(this.positionOf(object));
    const placed = withPathFrom(withEntityId(example, this.ids.shift()!), at, leapWay(object.reverse === true));
    this.entities[zone].push(withOwnSettings(placed, object, this.scale));
  }

  // a floating leaf or sliding pillar (example) moving along its path's nodes
  // from its spot: its points as far along them as its own level's are along
  // its own path, so it eases and takes as long, in the zone its spot is in
  placeOnItsNodes(obstacle: LevelObject, example: Buffer): void {
    const position = this.positionOf(obstacle);
    const { zone, at } = this.inZone(position);
    const nodes = pathPositions(obstacle, this.turn, this.scale).map((node) => this.positionOf({ ...obstacle, at: node, raise: 0 }));
    const length = pathLength(nodes);
    const points = ownPathShares(obstacle, length, example).map((share) => pointAlongShare(nodes, share));
    const drift = points.map((point) => point.map((value, axis) => at[axis] + value - position[axis]) as Vec3);
    const placed = withPath(withEntityId(example, this.ids.shift()!), drift);
    this.entities[zone].push(withRideSpeed(withSlideTiming(placed, obstacle, length, this.scale), obstacle, drift.length, length, this.scale));
  }

  // a mossy slide's slider (example) at its spot, sliding along its slope from there (run, from its spot)
  placeSlide(slide: LevelObject, example: Buffer, run: Vec3[]): void {
    const { zone, at } = this.inZone(this.positionOf(slide));
    const path = run.map((point) => point.map((value, axis) => value + at[axis]) as Vec3);
    this.entities[zone].push(withPath(withEntityId(example, this.ids.shift()!), path));
  }

  // leader bats: their roost (roost, an example) where their flight between
  // the leaders starts, the flight its path, and the two leaders (leader, an
  // example), each pointed at the roost by its id
  placeLeaderBats(enemy: LevelObject, roost: Buffer, leader: Buffer): void {
    const leaders = spotAndNode(enemy, this.turn, this.scale).map((spot) => this.positionOf({ ...enemy, at: spot, raise: 0 }));
    const [first, second] = spotAndNode(enemy, this.turn, this.scale);
    const roostId = this.placeOnFlight(enemy, roost, leaderBatsFlight(first, second, this.turn, this.scale));
    for (const spot of leaders) {
      const { zone, at } = this.inZone(spot);
      this.entities[zone].push(withInitFlagA(withPosition(withEntityId(leader, this.ids.shift()!), at), roostId));
    }
  }

  // a bat roost (roost, an example) at its spot, raised, its swoop to its
  // path's node (by default temple ruins') its path
  placeBatRoost(enemy: LevelObject, roost: Buffer): void {
    const [spot, end] = spotAndNode(enemy, this.turn, this.scale);
    this.placeOnFlight(enemy, roost, batSwoop(spot, end, this.turn, this.scale));
  }

  // a bat roost (roost, an example) where its bats' flight (in blender)
  // starts, in the zone it's in, the flight its path. its entity id
  private placeOnFlight(enemy: LevelObject, roost: Buffer, flightInBlender: Vec3[]): number {
    const flight = flightInBlender.map((point) => this.positionOf({ ...enemy, at: point, raise: 0 }));
    const { zone, at } = this.inZone(flight[0]);
    const path = flight.map((point) => point.map((value, axis) => at[axis] + value - flight[0][axis]) as Vec3);
    const id = this.ids.shift()!;
    this.entities[zone].push(roostEntity(withPath(withEntityId(roost, id), path), enemy));
    return id;
  }

  // an enemy that moves along a path (a crab, turtle, native or badger), as
  // example, in the zone its spot is in: its path's nodes (or its default path's)
  // in the level, in steps as long as its own level's, times its speed (the game
  // moves it a step at a time, so longer steps are faster)
  placeOnPath(enemy: LevelObject, example: Buffer): void {
    const position = this.positionOf(enemy);
    const { zone, at } = this.inZone(position);
    const nodes = pathPositions(enemy, this.turn, this.scale).map((node) => this.positionOf({ ...enemy, at: node, raise: 0 }));
    const step = pathStep(enemy.enemy as PathEnemy) * numberSetting(enemy, "speed");
    const run = inEvenSteps(nodes, step).map((point) => point.map((value, axis) => at[axis] + value - position[axis]) as Vec3);
    this.entities[zone].push(pathEnemyEntity(withEntityId(example, this.ids.shift()!), enemy, run));
  }

  // a rolling stone, in the zone its spot is in, rolling jungle rollers' path along its track
  placeStone(stone: LevelObject, track: StoneTrack): void {
    const { zone, at } = this.trackPlace(stone, track);
    const path = track.path.map((point) => point.map((value, axis) => value + at[axis]) as Vec3);
    const [type, subtype] = OBSTACLE_ENTITIES.rolling_stone;
    const placed = withPath(withEntityId(this.templates.entity(type, subtype), this.ids.shift()!), path);
    this.entities[zone].push(withInitFlagA(placed, stoneStartFlag(stone.start ?? 0, stone.reverse === true)));
  }

  // the zone an object's in
  zoneOf(object: LevelObject): number {
    return this.inZone(this.positionOf(object)).zone;
  }

  // where a rolling stone's track goes in the level (where its path starts):
  // its floor under the middle of its path a box's height over the stone's spot
  trackStart(stone: LevelObject, track: StoneTrack): Vec3 {
    const [x, y, z] = this.positionOf(stone);
    const middle = track.path[Math.floor(track.path.length / 2)];
    return [x - middle[0], y + STONE_TRACK_LIFT - track.floor, z - middle[2]];
  }

  // where a rolling stone's track goes relative to the zone the stone's in, and which zone
  trackPlace(stone: LevelObject, track: StoneTrack): { zone: number; at: Vec3 } {
    const { zone } = this.inZone(this.positionOf(stone));
    const start = this.trackStart(stone, track);
    return { zone, at: [start[0], start[1], start[2] - this.map.spans[zone][0]] };
  }

  // the warp pad that ends the level; where it stands in its zone, and which zone
  placeWarpPad(position: Vec3): { zone: number; at: Vec3 } {
    const placed = this.inZone(position);
    const pad = withEntityId(this.templates.entity(WARP_PAD[0], WARP_PAD[1]), this.ids.shift()!);
    this.entities[placed.zone].push(withPosition(pad, placed.at));
    return placed;
  }
}

function fitMap(text: string, scale: number, turn: number): FittedMap {
  const fitted = fit(readObj(text, scale, turn), MAP_CELL, MAP_HEADROOM, MAP_CELL, true);
  return { fitted, spans: zoneSpans(fitted.size[2], MAP_CELL) };
}

const PAD_TOP = 32; // how far below the pad its base's top can be (the base reaches 16 above and 600 below)

// the warp pad's base is solid where it stands, so a pad raised off the floor
// can be stood on (the game ends the level when crash lands on it); on the
// floor, the floor already is
function addWarpPadFloor(cells: Cells, base: MapPiece, at: Vec3, size: Vec3): void {
  const top = base.vertices.filter(({ at: [, y] }) => y >= -PAD_TOP).map(({ at: vertex }) => vertex);
  const xs = top.map(([x]) => x);
  const zs = top.map(([, , z]) => z);
  addFloor(cells, [at[0] + Math.min(...xs), at[2] + Math.min(...zs)], [at[0] + Math.max(...xs), at[2] + Math.max(...zs)], at[1], size, MAP_CELL);
}

type Worlds = ReturnType<typeof addMapPiece>;

// the world meshes of a zone, by their index among all the zones' meshes
function meshesInZone(zoneWorlds: WorldMesh[][], zone: number): number[] {
  const first = zoneWorlds.slice(0, zone).reduce((sum, worlds) => sum + worlds.length, 0);
  return zoneWorlds[zone].map((_, index) => first + index);
}

// the worlds with jungle rollers' track under each rolling stone, in the mesh
// kept for them at the end of the stone's zone's meshes (see zoneWorldMeshes)
function withStoneTracks(worlds: Worlds, stones: LevelObject[], track: StoneTrack, placer: ObjectPlacer, zoneWorlds: WorldMesh[][], template: Buffer): Worlds {
  return stones.reduce((built, stone) => {
    const { zone, at } = placer.trackPlace(stone, track);
    const tracksMesh = meshesInZone(zoneWorlds, zone).at(-1)!;
    return addMapPiece(built, track, at, template, [tracksMesh], "a rolling stone's track");
  }, worlds);
}

// each rolling stone's track as a mesh where it goes, for the collision, so
// crash stands in its groove, can't walk through its sides, and steps onto it
// where it meets the map as he does the map's own lips
function stoneTrackMeshes(stones: LevelObject[], track: StoneTrack | null, placer: ObjectPlacer): Mesh[] {
  return track ? stones.map((stone) => pieceMesh(track, placer.trackStart(stone, track))) : [];
}

const boxCount = (boxes: LevelObject[]) => boxes.reduce((sum, box) => sum + box.stack, 0);

// the boxes crash can break: all but the iron and switch boxes
const breakableBoxes = (boxes: LevelObject[]) => boxCount(boxes.filter((box) => !UNBREAKABLE_BOXES.includes(boxSubtype(box))));

// the header every zone's is made from: the base level's, with the level's sky, and its music if it isn't the base level's
function zoneHeaderTemplate(header: Buffer, sky: Sky, music: LevelMusic | null): Buffer {
  const withItsSky = withSky(header, sky);
  if (!music) {
    return withItsSky;
  }
  return withMusic(withItsSky, music.eid);
}

export function makeMap(level: Level, text: string, options: MapOptions = {}): Level {
  const { scale = MAP_SCALE, turn = 0, images = new Map(), objects = [], sky = DEFAULT_SKY, camera = DEFAULT_CAMERA, readOtherLevel } = options;
  const music = soundtrackMusic(options.music, readOtherLevel);
  const offsets = cameraOffsets(camera);
  const base = readTemplates(level);
  const templates = { ...base, header: zoneHeaderTemplate(base.header, sky, music) }; // every zone's header is made from this one
  const map = fitMap(text, scale, turn);
  const { fitted, spans } = map;
  const spawn = objects.find((object) => object.kind === "spawn");
  const end = objects.find((object) => object.kind === "end");
  const boxes = objects.filter((object) => object.kind === "box");
  const enemies = objects.filter((object) => object.kind === "enemy");
  const obstacles = objects.filter((object) => object.kind === "obstacle");
  const stones = obstacles.filter((obstacle) => obstacle.obstacle === "rolling_stone");
  const donorLevels = objectDonorLevels([...enemies, ...obstacles], readOtherLevel);
  const entityCount = Number(end !== undefined) + boxCount(boxes) + enemies.reduce((sum, enemy) => sum + entitiesFor(enemy), 0)
    + obstacles.reduce((sum, obstacle) => sum + entitiesForObstacle(obstacle), 0);
  const placer = new ObjectPlacer(map, templates, scale, turn, entityCount);
  const track = stones.length ? withLongerSkirts(stoneTrack(level), STONE_TRACK_LIFT) : null;
  const cells = solidCells(fitted.mesh, fitted.size, MAP_CELL, stoneTrackMeshes(stones, track, placer));

  const zoneWorlds = zoneWorldMeshes(map, templates, new Set(images.keys()), new Set(stones.map((stone) => placer.zoneOf(stone))));
  const template = templates.world.items[0];
  const { pages, ...textured } = textureWorlds(zoneWorlds.flat(), images, template);

  const start = spawn ? placer.positionOf(spawn) : spawnPoint(fitted.mesh, cells, MAP_CELL);
  const spawnZone = placer.placeCrash(start);
  boxes.forEach((box) => placer.placeBoxStack(box));
  linkSwitches(placer.entities, placer.placedBoxes);

  // an enemy's entity as its own level has it: its donor level's, or jungle rollers'
  const enemyExample = (type: EnemyType) => {
    const donor = donorLevels.get(type);
    if (donor && type === "gunman") {
      return gunmanExample(donor);
    }
    if (donor && type === "bat") {
      return batRoostExample(donor);
    }
    if (donor) {
      return donorEnemyEntity(donor, type);
    }
    return templates.entity(...ENEMY_ENTITIES[type]);
  };
  enemies.filter((enemy) => STANDING_ENEMIES.includes(enemy.enemy!)).forEach((enemy) => placer.placeAtSpot(enemy, enemyExample(enemy.enemy!)));
  enemies.filter((enemy) => enemy.enemy === "gunman").forEach((enemy) => placer.placeGunman(enemy, enemyExample("gunman")));
  enemies.filter((enemy) => enemy.enemy === "lab_assistant").forEach((enemy) => placer.placeLabAssistant(enemy, enemyExample("lab_assistant")));
  enemies.filter((enemy) => OWN_PATH_ENEMIES.includes(enemy.enemy!)).forEach((enemy) => placer.placeWithItsPath(enemy, enemyExample(enemy.enemy!)));
  enemies.filter((enemy) => enemy.enemy === "bat").forEach((enemy) => placer.placeBatRoost(enemy, enemyExample("bat")));
  enemies.filter((enemy) => enemy.enemy === "leader_bats")
    .forEach((enemy) => placer.placeLeaderBats(enemy, enemyExample("leader_bats"), levelEntity(donorLevels.get("leader_bats")!, ...LEADER_BAT)));
  const slides = obstacles.filter((obstacle) => obstacle.obstacle === "mossy_slide");
  const timed = obstacles.filter((obstacle) => TIMED_OBSTACLES.includes(obstacle.obstacle!));
  const placedApart: ObstacleType[] = ["rolling_stone", "mossy_slide", "slamming_walls", ...TIMED_OBSTACLES];
  const movers = obstacles.filter((obstacle) => !placedApart.includes(obstacle.obstacle!)); // the rest, from their levels
  const obstacleOf = (obstacle: LevelObject) => obstacleExample(donorLevels.get(obstacle.obstacle!)!, obstacle.obstacle!);
  slides.forEach((slide) => placer.placeSlide(slide, obstacleOf(slide), slidePath(slide, scale)));
  timed.forEach((obstacle) => placer.placeTimedObstacle(obstacle, obstacleOf(obstacle)));
  obstacles.filter((obstacle) => obstacle.obstacle === "slamming_walls")
    .forEach((walls) => placer.placeSlammingWalls(walls, obstacleOf(walls), slammingWallLeft(donorLevels.get("slamming_walls")!)));
  movers.filter((obstacle) => !onItsNodes(obstacle)).forEach((obstacle) => placer.placeWithItsPath(obstacle, obstacleOf(obstacle)));
  movers.filter(onItsNodes).forEach((obstacle) => placer.placeOnItsNodes(obstacle, obstacleOf(obstacle)));
  stones.forEach((stone) => placer.placeStone(stone, track!));
  enemies.filter(hasPath).forEach((enemy) => placer.placeOnPath(enemy, enemyExample(enemy.enemy!)));
  let withBase = track ? withStoneTracks(textured, stones, track, placer, zoneWorlds, template) : textured;
  if (end) {
    const position = placer.positionOf(end);
    const pad = placer.placeWarpPad(position);
    const padBase = warpPadBase(level);
    withBase = addMapPiece(withBase, padBase, pad.at, template, meshesInZone(zoneWorlds, pad.zone), "the warp pad's base");
    addWarpPadFloor(cells, padBase, position, fitted.size);
  }

  const zonePlans = (step: number): ZonePlan[] => {
    const paths = zonePaths(cameraPath(cells, fitted.size, MAP_CELL, start, step, offsets), spans, offsets.lead);
    let first = 0;
    return spans.map((span, index) => {
      const count = zoneWorlds[index].length;
      const plan = {
        zOffset: span[0] - spans[0][0],
        blocks: cellBlocks(zoneCells(cells, span, MAP_CELL), MAP_CELL),
        worlds: withBase.worlds.slice(first, first + count),
        texinfos: withBase.texinfos.slice(first, first + count),
        points: paths[index],
        entities: placer.entities[index],
      };
      first += count;
      return plan;
    });
  };

  const size: Vec3 = [fitted.size[0], fitted.size[1], spans[0][1] - spans[0][0]];
  const donors = objectDonorObjects(donorLevels);
  for (let step = MAP_PATH_STEP; ; step *= 2) {
    try {
      const out = assembleLevel({
        level, templates, size, zones: zonePlans(step), step, spawnZone, pageEids: withBase.pageEids, texturePages: pages, donors, camera, music,
      });
      out.nsd.ldat.boxTotal = breakableBoxes(boxes);
      return out;
    } catch (error) {
      const isSortListTooBig = error instanceof EntryTooBig && error.entry.type === ENTRY_SLST;
      if (!isSortListTooBig || step >= MAP_PIECE) { // only the sort lists shrink, with fewer path points
        throw error;
      }
    }
  }
}
