// a custom level from a map modelled in blender (its .obj's text): its faces
// as the level's world meshes and collision, crash, and the objects placed in
// it; built from a real level (the base level) for crash, the objects and
// textures. faces of materials with an image get it, the rest the base level's textures
import { batSwoop, leafDriftShares, leaderBatsFlight, leapWay } from "../src/coords";
import { inEvenSteps, pathPositions, pathStep, pointAlongShare, spotAndNode } from "../src/enemyPaths";
import { hasPath, LEADER_BATS_LEADERS, numberSetting, TIMED_OBSTACLES, type EnemyType, type LevelObject, type PathEnemy, type ObstacleType } from "../src/objects";
import { throwFlags } from "../src/labAssistantThrow";
import { DEFAULT_SKY, type Sky } from "../src/sky";
import { assembleLevel, MAP_CELL, type ZonePlan } from "./assembleLevel";
import { addFloor, Cells, solidCells } from "./collision";
import { EntryTooBig } from "./cutLevel";
import { objectDonorLevels, objectDonorObjects } from "./donorObjects";
import {
  BOX_HEIGHT, BOX_TYPE, donorEntityType, ENEMY_ENTITIES, entityId, linkSwitches, newEntityIds, stoneStartFlag, UNBREAKABLE_BOXES, withInitFlagA, withInitFlagC,
  LEADER_BAT, OBSTACLE_ENTITIES, WARP_PAD, withEntityId, withEntityType, withInitFlagB, withPath, withPathFrom, withPosition, withSubtype, type PlacedBox,
} from "./entities";
import { fit, zoneCells, zoneSpans, type Fit, type Span } from "./fit";
import type { RgbImage } from "./images";
import { ENTRY_SLST, type Level } from "./levelFiles";
import { boxSubtype, toZone } from "./levelObjects";
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

// an obstacle's entity from the level it's taken from
const obstacleExample = (donor: Level, type: ObstacleType): Buffer => levelEntity(donor, ...OBSTACLE_ENTITIES[type]);

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
      const box = withEntityId(this.templates.entity(BOX_TYPE, subtype), id);
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

  // a spiked log or fire pit (example) at its spot, a falling log hung over it
  // (see SPIKED_LOG_HANG), its init flags its timing (see obstacleTiming)
  placeTimedObstacle(obstacle: LevelObject, example: Buffer): void {
    const { zone, at } = this.inZone(this.positionOf(obstacle));
    const hung: Vec3 = [at[0], at[1] + timedObstacleHang(obstacle), at[2]];
    const [every, into] = obstacleTiming(obstacle);
    const placed = withPosition(withEntityId(example, this.ids.shift()!), hung);
    this.entities[zone].push(withInitFlagB(withInitFlagA(placed, every), into));
  }

  // an enemy or obstacle that moves along its own level's path, as example, from
  // its spot: up the creek's fish, leaping across the map (the other way,
  // reversed), its lily pad sinking and its leaf drifting
  placeWithItsPath(object: LevelObject, example: Buffer): void {
    const { zone, at } = this.inZone(this.positionOf(object));
    this.entities[zone].push(withPathFrom(withEntityId(example, this.ids.shift()!), at, leapWay(object.reverse === true)));
  }

  // a floating leaf (example) drifting along its path's nodes from its spot: its
  // points as far along them as its own drift's are along that, so it eases and
  // takes as long, in the zone its spot is in
  placeLeafOnPath(leaf: LevelObject, example: Buffer): void {
    const position = this.positionOf(leaf);
    const { zone, at } = this.inZone(position);
    const nodes = pathPositions(leaf, this.turn, this.scale).map((node) => this.positionOf({ ...leaf, at: node, raise: 0 }));
    const points = leafDriftShares().map((share) => pointAlongShare(nodes, share));
    const drift = points.map((point) => point.map((value, axis) => at[axis] + value - position[axis]) as Vec3);
    this.entities[zone].push(withPath(withEntityId(example, this.ids.shift()!), drift));
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

export function makeMap(level: Level, text: string, options: MapOptions = {}): Level {
  const { scale = MAP_SCALE, turn = 0, images = new Map(), objects = [], sky = DEFAULT_SKY, camera = DEFAULT_CAMERA, readOtherLevel } = options;
  const offsets = cameraOffsets(camera);
  const base = readTemplates(level);
  const templates = { ...base, header: withSky(base.header, sky) }; // every zone's header is made from this one
  const map = fitMap(text, scale, turn);
  const { fitted, spans } = map;
  const spawn = objects.find((object) => object.kind === "spawn");
  const end = objects.find((object) => object.kind === "end");
  const boxes = objects.filter((object) => object.kind === "box");
  const enemies = objects.filter((object) => object.kind === "enemy");
  const obstacles = objects.filter((object) => object.kind === "obstacle");
  const stones = obstacles.filter((obstacle) => obstacle.obstacle === "rolling_stone");
  const donorLevels = objectDonorLevels([...enemies, ...obstacles], readOtherLevel);
  const entityCount = Number(end !== undefined) + boxCount(boxes) + enemies.reduce((sum, enemy) => sum + entitiesFor(enemy), 0) + obstacles.length;
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
  const placedApart: ObstacleType[] = ["rolling_stone", "mossy_slide", ...TIMED_OBSTACLES];
  const movers = obstacles.filter((obstacle) => !placedApart.includes(obstacle.obstacle!)); // the rest, from their levels
  const obstacleOf = (obstacle: LevelObject) => obstacleExample(donorLevels.get(obstacle.obstacle!)!, obstacle.obstacle!);
  slides.forEach((slide) => placer.placeSlide(slide, obstacleOf(slide), slidePath(slide, scale)));
  timed.forEach((obstacle) => placer.placeTimedObstacle(obstacle, obstacleOf(obstacle)));
  movers.filter((obstacle) => !obstacle.path).forEach((obstacle) => placer.placeWithItsPath(obstacle, obstacleOf(obstacle)));
  movers.filter((obstacle) => obstacle.path).forEach((leaf) => placer.placeLeafOnPath(leaf, obstacleOf(leaf)));
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
        level, templates, size, zones: zonePlans(step), step, spawnZone, pageEids: withBase.pageEids, texturePages: pages, donors, camera,
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
