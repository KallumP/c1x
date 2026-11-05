// a custom level from a map modelled in blender (its .obj's text): its faces
// as the level's world meshes and collision, crash, and the objects placed in
// it; built from a real level (the base level) for crash, the objects and
// textures. faces of materials with an image get it, the rest the base level's textures
import type { LevelObject } from "../src/objects";
import { DEFAULT_SKY, type Sky } from "../src/sky";
import { assembleLevel, MAP_CELL, type ZonePlan } from "./assembleLevel";
import { addFloor, Cells, solidCells } from "./collision";
import { EntryTooBig } from "./cutLevel";
import {
  BOX_HEIGHT, BOX_TYPE, ENEMY_ENTITIES, entityId, linkSwitches, newEntityIds, UNBREAKABLE_BOXES, WARP_PAD, withEntityId, withPosition,
  type PlacedBox,
} from "./entities";
import { fit, zoneCells, zoneSpans, type Fit, type Span } from "./fit";
import type { RgbImage } from "./images";
import { ENTRY_SLST, type Level } from "./levelFiles";
import { boxSubtype, toZone } from "./levelObjects";
import { addWarpPadBase, TEXINFO_WORDS_MAX, textureWorlds } from "./mapTextures";
import { readObj } from "./obj";
import { LEAF_FLOOR, LEAF_GROUND, LEAF_PIT, type Block } from "./octree";
import { roundHalfToEven } from "./pyMath";
import { cameraPath, spawnPoint, zoneIndex, zonePaths } from "./route";
import { readTemplates, warpPadBase, type Templates, type WarpPadBase } from "./templates";
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
  cells: Cells;
  spans: Span[];
}

// each zone's world meshes; with more than one zone, each lists the next's too, so half as many
function zoneWorldMeshes({ fitted, spans }: FittedMap, templates: Templates, textured: Set<string>): WorldMesh[][] {
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
  return spans.map((span) => worldMeshes(fitted.mesh, { ...options, span }));
}

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

  // an enemy, at its spot in the zone it's in
  placeEnemy(object: LevelObject): void {
    const { zone, at } = this.inZone(this.positionOf(object));
    const [type, subtype] = ENEMY_ENTITIES[object.enemy!];
    const enemy = withEntityId(this.templates.entity(type, subtype), this.ids.shift()!);
    this.entities[zone].push(withPosition(enemy, at));
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
  return { fitted, cells: solidCells(fitted.mesh, fitted.size, MAP_CELL), spans: zoneSpans(fitted.size[2], MAP_CELL) };
}

const PAD_TOP = 32; // how far below the pad its base's top can be (the base reaches 16 above and 600 below)

// the warp pad's base is solid where it stands, so a pad raised off the floor
// can be stood on (the game ends the level when crash lands on it); on the
// floor, the floor already is
function addWarpPadFloor(cells: Cells, base: WarpPadBase, at: Vec3, size: Vec3): void {
  const top = base.vertices.filter(({ at: [, y] }) => y >= -PAD_TOP).map(({ at: vertex }) => vertex);
  const xs = top.map(([x]) => x);
  const zs = top.map(([, , z]) => z);
  addFloor(cells, [at[0] + Math.min(...xs), at[2] + Math.min(...zs)], [at[0] + Math.max(...xs), at[2] + Math.max(...zs)], at[1], size, MAP_CELL);
}

const boxCount = (boxes: LevelObject[]) => boxes.reduce((sum, box) => sum + box.stack, 0);

// the boxes crash can break: all but the iron and switch boxes
const breakableBoxes = (boxes: LevelObject[]) => boxCount(boxes.filter((box) => !UNBREAKABLE_BOXES.includes(boxSubtype(box))));

export function makeMap(level: Level, text: string, options: MapOptions = {}): Level {
  const { scale = MAP_SCALE, turn = 0, images = new Map(), objects = [], sky = DEFAULT_SKY } = options;
  const base = readTemplates(level);
  const templates = { ...base, header: withSky(base.header, sky) }; // every zone's header is made from this one
  const map = fitMap(text, scale, turn);
  const { fitted, cells, spans } = map;
  const zoneWorlds = zoneWorldMeshes(map, templates, new Set(images.keys()));
  const template = templates.world.items[0];
  const { pages, ...textured } = textureWorlds(zoneWorlds.flat(), images, template);

  const spawn = objects.find((object) => object.kind === "spawn");
  const end = objects.find((object) => object.kind === "end");
  const boxes = objects.filter((object) => object.kind === "box");
  const enemies = objects.filter((object) => object.kind === "enemy");
  const placer = new ObjectPlacer(map, templates, scale, turn, (end ? 1 : 0) + boxCount(boxes) + enemies.length);
  const start = spawn ? placer.positionOf(spawn) : spawnPoint(fitted.mesh, cells, MAP_CELL);
  const spawnZone = placer.placeCrash(start);
  boxes.forEach((box) => placer.placeBoxStack(box));
  linkSwitches(placer.entities, placer.placedBoxes);
  enemies.forEach((enemy) => placer.placeEnemy(enemy));

  let withBase = textured;
  if (end) {
    const position = placer.positionOf(end);
    const pad = placer.placeWarpPad(position);
    const first = zoneWorlds.slice(0, pad.zone).reduce((sum, worlds) => sum + worlds.length, 0);
    const candidates = zoneWorlds[pad.zone].map((_, index) => first + index);
    const padBase = warpPadBase(level);
    withBase = addWarpPadBase(textured, padBase, pad.at, template, candidates);
    addWarpPadFloor(cells, padBase, position, fitted.size);
  }

  const zonePlans = (step: number): ZonePlan[] => {
    const paths = zonePaths(cameraPath(cells, fitted.size, MAP_CELL, start, step), spans);
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
  for (let step = MAP_PATH_STEP; ; step *= 2) {
    try {
      const out = assembleLevel({
        level, templates, size, zones: zonePlans(step), step, spawnZone, pageEids: withBase.pageEids, texturePages: pages,
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
