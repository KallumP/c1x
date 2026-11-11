// what custom levels take from a real level (the base level): its spawn zone's
// header and origin, crash, its biggest world mesh (for textures), an example of
// each kind of entity, the base the warp pad stands on, and a rolling stone's
// track; and from the great gate, the mossy planks under its slides
import { BOX_TYPE, CRASH, OBSTACLE_ENTITIES, entityPath, entityPosition, entityType, WARP_PAD, withInitFlagA, withSubtype } from "./entities";
import { ENTRY_ZDAT, entriesById, type Entry, type Level } from "./levelFiles";
import type { Mesh } from "./obj";
import type { Vec3 } from "./vectors";
import { readWorldHeader, readWorldPolygon, readWorldVertex, TEXINFOS_AT, type BuiltPolygon } from "./worldGeometry";
import type { PageTexture, WorldVertex } from "./worldMeshes";
import { zoneEntities, zoneOrigin, zoneWorldEids } from "./zones";

export interface Templates {
  header: Buffer;             // the spawn zone's header
  origin: Vec3;               // where the spawn zone is
  world: Entry;               // its biggest world mesh that isn't a backdrop
  textures: PageTexture[];    // the textures that mesh uses, most used first
  crash: Buffer;
  entity(type: number, subtype: number): Buffer; // an example of each kind of entity (see exampleEntity)
}

const zonesOf = (level: Level) => [...entriesById(level).values()].filter((entry) => entry.type === ENTRY_ZDAT);

function polygonsOf(world: Entry): BuiltPolygon[] {
  const polygons = world.items[1];
  return Array.from({ length: Math.floor(polygons.length / 8) }, (_, index) => readWorldPolygon(polygons.subarray(8 * index, 8 * index + 8)));
}

// the (texinfo, page) pairs a mesh's polygons use, most used first
export function usedTextures(world: Entry): PageTexture[] {
  const counts = new Map<string, { texture: PageTexture; count: number }>();
  for (const { texinfo, page } of polygonsOf(world)) {
    const key = `${texinfo},${page}`;
    const used = counts.get(key) ?? { texture: { texinfo, page }, count: 0 };
    counts.set(key, { ...used, count: used.count + 1 });
  }
  return [...counts.values()].sort((first, second) => second.count - first.count).map(({ texture }) => texture);
}

function biggestWorld(worlds: Entry[]): Entry {
  const solid = worlds.filter((world) => !readWorldHeader(world.items[0]).isBackdrop);
  return solid.reduce((biggest, world) => (world.items[1].length > biggest.items[1].length ? world : biggest));
}

// the first entity of each (type, subtype) in the level's zones
function exampleEntities(level: Level): Map<string, Buffer> {
  const examples = new Map<string, Buffer>();
  for (const zone of zonesOf(level)) {
    for (const item of zoneEntities(zone)) {
      const key = entityType(item).join();
      if (!examples.has(key)) {
        examples.set(key, item);
      }
    }
  }
  return examples;
}

// the level's first entity of a type and subtype, from any level (such as an
// enemy's, from the level it's taken from). an error if it has none
export function levelEntity(level: Level, type: number, subtype: number): Buffer {
  const example = exampleEntities(level).get(`${type},${subtype}`);
  if (!example) {
    throw new Error(`the level (${level.nsd.ldat.lid.toString(16)}) has no entity of type ${type}, subtype ${subtype}`);
  }
  return example;
}

const BASIC_BOX = 2;

// the level's first entity of a type and subtype. a box of a subtype the level
// has none of (such as the ! box in jungle rollers) is its basic box with that
// subtype, as boxes differ only by subtype; and a box holds nothing extra, as
// the level's own may (all of jungle rollers' ? boxes hold tawna's token or the like)
function exampleEntity(examples: Map<string, Buffer>, type: number, subtype: number): Buffer {
  const example = examples.get(`${type},${subtype}`);
  if (type !== BOX_TYPE) {
    return example!;
  }
  return withInitFlagA(example ?? withSubtype(examples.get(`${BOX_TYPE},${BASIC_BOX}`)!, subtype), 0);
}

export function readTemplates(level: Level): Templates {
  const entries = entriesById(level);
  const zone = entries.get(level.nsd.ldat.zoneSpawn)!;
  const world = biggestWorld(zoneWorldEids(zone).map((eid) => entries.get(eid)!));
  const examples = exampleEntities(level);
  return {
    header: zone.items[0],
    origin: zoneOrigin(zone),
    world,
    textures: usedTextures(world),
    crash: examples.get(CRASH.join())!,
    entity: (type, subtype) => exampleEntity(examples, type, subtype),
  };
}

// pieces of the base level's terrain, added to custom levels: the warp pad's
// base, and the track a rolling stone rolls in

// a piece of terrain: its vertices relative to a point (where the warp pad
// stands, or a rolling stone's path starts), its polygons (each with its
// texinfo and texture page), and the texinfos they use (8 bytes each)
export interface MapPiece {
  vertices: WorldVertex[];
  polygons: { corners: [number, number, number]; texinfo: number; page: number }[];
  texinfos: Map<number, Buffer>;
}

// a world mesh's vertices relative to point (zone units)
function verticesRelativeTo(world: Entry, point: Vec3): WorldVertex[] {
  const header = readWorldHeader(world.items[0]);
  const vertices = world.items[2];
  return Array.from({ length: header.vertexCount }, (_, index) => {
    const { at, colour } = readWorldVertex(vertices.subarray(8 * index, 8 * index + 8));
    return { at: [0, 1, 2].map((axis) => at[axis] + header.origin[axis] - point[axis]) as Vec3, colour };
  });
}

const worldPolygons = (world: Entry) => polygonsOf(world).slice(0, readWorldHeader(world.items[0]).polygonCount);

// the piece of a world mesh made of chosen (some of its polygons), its vertices relative to a point
function pieceOf(world: Entry, vertices: WorldVertex[], chosen: BuiltPolygon[]): MapPiece {
  const used = [...new Set(chosen.flatMap(({ corners }) => corners))].sort((first, second) => first - second);
  const newIndex = new Map(used.map((vertex, index) => [vertex, index]));
  const header = world.items[0];
  const pages = readWorldHeader(header).pages;
  return {
    vertices: used.map((index) => vertices[index]),
    polygons: chosen.map(({ corners, texinfo, page }) => ({
      corners: corners.map((corner) => newIndex.get(corner)!) as [number, number, number],
      texinfo,
      page: pages[page],
    })),
    texinfos: new Map(chosen.map(({ texinfo }) => [texinfo, header.subarray(TEXINFOS_AT + 4 * texinfo, TEXINFOS_AT + 4 * texinfo + 8)])),
  };
}

// a triangle's corners turned to face up (the corners' order sets which way it faces)
function facingUp(corners: [number, number, number], vertices: Vec3[]): [number, number, number] {
  const [a, b, c] = corners.map((corner) => vertices[corner]);
  const upness = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); // the y of (b - a) x (c - a)
  return upness < 0 ? [corners[0], corners[2], corners[1]] : corners;
}

// a piece as a mesh moved to at, for the collision: its faces up, so a floor is
// a floor whichever way the base level winds its corners
export function pieceMesh(piece: MapPiece, at: Vec3): Mesh {
  const vertices = piece.vertices.map(({ at: vertex }) => vertex.map((value, axis) => value + at[axis]) as Vec3);
  const triangles = piece.polygons.map(({ corners }) => ({ corners: facingUp(corners, vertices), object: null, material: null }));
  return { vertices, triangles, materialLibraries: [] };
}

// a box around a piece's point (zone units)
interface Box {
  low: Vec3;
  high: Vec3;
}

// whether all of a polygon's corners are in a box
const isInBox = (polygon: BuiltPolygon, vertices: WorldVertex[], { low, high }: Box) =>
  polygon.corners.every((index) => vertices[index].at.every((value, axis) => value >= low[axis] && value <= high[axis]));

// where an entity is in the level (zone units)
function entityAt(zone: Entry, item: Buffer): Vec3 {
  const origin = zoneOrigin(zone);
  return entityPosition(item).map((offset, axis) => origin[axis] + offset) as Vec3;
}

// the warp pad's base

const WARP_PAD_REACH = 700; // how far around the warp pad (zone units) its base can go
const AROUND_PAD: Box = { low: [-WARP_PAD_REACH, -WARP_PAD_REACH, -WARP_PAD_REACH], high: [WARP_PAD_REACH, 64, WARP_PAD_REACH] };

// the texture page slots only the polygons all around the pad use
function slotsOnlyAroundPad(polygons: BuiltPolygon[], vertices: WorldVertex[]): number[] {
  const isAround = (polygon: BuiltPolygon) => isInBox(polygon, vertices, AROUND_PAD);
  const slots = [...new Set(polygons.filter(isAround).map(({ page }) => page))].sort((first, second) => first - second);
  return slots.filter((slot) => polygons.filter(({ page }) => page === slot).every(isAround));
}

// the base in a world mesh around the pad (where it stands, zone units), or null
function worldWarpPadBase(world: Entry, pad: Vec3): MapPiece | null {
  const vertices = verticesRelativeTo(world, pad);
  const polygons = worldPolygons(world);
  const slots = slotsOnlyAroundPad(polygons, vertices);
  if (slots.length !== 1) {
    return null;
  }
  return pieceOf(world, vertices, polygons.filter(({ page }) => page === slots[0]));
}

// the warp pad's base in level (the base level): the polygons of the world
// mesh under its warp pad on the texture pages only the base uses, which are
// those all around the pad
export function warpPadBase(level: Level): MapPiece {
  const entries = entriesById(level);
  for (const zone of zonesOf(level)) {
    for (const item of zoneEntities(zone)) {
      if (entityType(item).join() !== WARP_PAD.join()) {
        continue;
      }
      const pad = entityAt(zone, item);
      for (const eid of zoneWorldEids(zone)) {
        const world = entries.get(eid);
        const base = world ? worldWarpPadBase(world, pad) : null;
        if (base) {
          return base;
        }
      }
    }
  }
  throw new Error("there's no warp pad base in the level");
}

// a rolling stone's track

// the track around a rolling stone's path, relative to its first point: the
// groove's floor across the walkway, from a little past one end of the path to
// the other (the path runs 3600 along -x), with the skirts under it, up to its
// side wall at z 58 (past that are the grassy banks and walkway beside it). it
// shares its texture pages with the ground around it, so it's cut out by this box
const AROUND_TRACK: Box = { low: [-4640, -1900, -350], high: [1030, 100, 60] };

// the groove a rolling stone rolls in, its path, and the height of its floor
// under the middle of the path (where the stone rolls), all relative to the path's first point
export interface StoneTrack extends MapPiece {
  path: Vec3[];
  floor: number;
}

const UNDER_MIDDLE = 300; // how far from under the middle of the path (zone units) the track's floor is looked for

// whether a polygon (its corners) lies more flat than upright
function isFlat([a, b, c]: Vec3[]): boolean {
  const [u, v] = [b.map((value, axis) => value - a[axis]), c.map((value, axis) => value - a[axis])];
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return Math.abs(normal[1]) > 0.7 * Math.hypot(...normal);
}

// the highest flat face of the track under the middle of its path: the groove's
// floor, the stone's radius below the path (the ground beside it is lower)
function floorUnderMiddle(track: MapPiece, path: Vec3[]): number {
  const middle = path[Math.floor(path.length / 2)];
  const flatCorners = track.polygons.map(({ corners }) => corners.map((corner) => track.vertices[corner].at)).filter(isFlat).flat();
  const under = flatCorners.filter(([x, , z]) => Math.abs(x - middle[0]) <= UNDER_MIDDLE && Math.abs(z - middle[2]) <= UNDER_MIDDLE);
  return Math.max(...under.map(([, y]) => y));
}

// how far over a rolling stone's spot its track's floor stands: a box's height
// (BOX_HEIGHT in entities.ts), more than crash steps up (about 244, land_offset
// in src/solid.c), so he has to jump up to it
export const STONE_TRACK_LIFT = 400;

// the track with its skirts reaching lift further down, for a track lifted by
// lift: its corners below its floor (the skirts' feet, in the ground) go lower,
// so the skirts still reach the floor under it
export function withLongerSkirts(track: StoneTrack, lift: number): StoneTrack {
  const vertices = track.vertices.map((vertex) => {
    const [x, y, z] = vertex.at;
    return y < track.floor ? { ...vertex, at: [x, y - lift, z] as Vec3 } : vertex;
  });
  return { ...track, vertices };
}

// the polygons of a world mesh in the box around a path's first point (zone units)
function worldTrack(world: Entry, start: Vec3): MapPiece {
  const vertices = verticesRelativeTo(world, start);
  return pieceOf(world, vertices, worldPolygons(world).filter((polygon) => isInBox(polygon, vertices, AROUND_TRACK)));
}

// a path relative to its first point
const fromFirstPoint = (path: Vec3[]) => path.map((point) => point.map((value, axis) => value - path[0][axis]) as Vec3);

// the track of the first rolling stone in level (the base level), from the
// world mesh of its zone with the most of it
export function stoneTrack(level: Level): StoneTrack {
  const entries = entriesById(level);
  for (const zone of zonesOf(level)) {
    const stone = zoneEntities(zone).find((item) => entityType(item).join() === OBSTACLE_ENTITIES.rolling_stone.join());
    if (!stone) {
      continue;
    }
    const start = entityAt(zone, stone);
    const pieces = zoneWorldEids(zone).flatMap((eid) => (entries.has(eid) ? [worldTrack(entries.get(eid)!, start)] : []));
    const track = pieces.reduce((most, piece) => (piece.polygons.length > most.polygons.length ? piece : most));
    const path = fromFirstPoint(entityPath(stone));
    return { ...track, path, floor: floorUnderMiddle(track, path) };
  }
  throw new Error("there's no rolling stone in the level");
}

// the great gate's mossy slide (WalOC subtype 2): an invisible object carrying
// crash down along its path while he's on the plank under it, which is the
// level's own map
const MOSSY_SLIDE: [number, number] = [33, 2];
const LONG_SLIDE_POINTS = 9;  // its long slides' paths (3600 units across), and its short ones' (2000)
const SHORT_SLIDE_POINTS = 5;

// how far round a slide's line its plank reaches (game units): its slats' tops
// a little over it, their log ends under it, and its width either side; the
// posts and ground further down aren't the plank's
const PLANK_ABOVE = 120;
const PLANK_BELOW = 360;
const PLANK_SIDE = 700;
const PLANK_BEYOND = 400; // past the ends of its path

// a mossy slide's plank, its vertices relative to its path's first point, and that path, from there
export interface MossySlope extends MapPiece {
  path: Vec3[];
}

// whether all of a polygon's corners are on a slide's plank: by its line (from
// its path's first point to its last), across the map along the path
function isOnPlank(polygon: BuiltPolygon, vertices: WorldVertex[], path: Vec3[]): boolean {
  const [endX, endY] = path[path.length - 1];
  const drop = endY / endX;
  return polygon.corners.every((index) => {
    const [x, y, z] = vertices[index].at;
    const height = y - drop * x;
    const along = x >= Math.min(0, endX) - PLANK_BEYOND && x <= Math.max(0, endX) + PLANK_BEYOND;
    return along && Math.abs(z) <= PLANK_SIDE && height >= -PLANK_BELOW && height <= PLANK_ABOVE;
  });
}

// whether a slide's path is long (or short) and runs back across the map (or on, along the game's x)
function isSlide(path: Vec3[], long: boolean, reverse: boolean): boolean {
  const across = path[path.length - 1][0];
  return path.length === slidePoints(long) && (across < 0) === reverse;
}

// how many points a long or short slide's path has
function slidePoints(long: boolean): number {
  if (long) {
    return LONG_SLIDE_POINTS;
  }
  return SHORT_SLIDE_POINTS;
}

// the plank under a slide, from the world mesh of its zone with the most of it
function slidePlank(level: Level, zone: Entry, start: Vec3, path: Vec3[]): MapPiece {
  const entries = entriesById(level);
  const planks = zoneWorldEids(zone).flatMap((eid) => {
    const world = entries.get(eid);
    if (!world) {
      return [];
    }
    const vertices = verticesRelativeTo(world, start);
    return [pieceOf(world, vertices, worldPolygons(world).filter((polygon) => isOnPlank(polygon, vertices, path)))];
  });
  return planks.reduce((most, plank) => (plank.polygons.length > most.polygons.length ? plank : most));
}

// the great gate's first mossy slide that's long (or short) and runs back across
// the map (reverse) or on: its plank and path. an error if it has none
export function mossySlope(level: Level, long: boolean, reverse: boolean): MossySlope {
  for (const zone of zonesOf(level)) {
    for (const slide of zoneEntities(zone).filter((item) => entityType(item).join() === MOSSY_SLIDE.join())) {
      const path = fromFirstPoint(entityPath(slide));
      if (isSlide(path, long, reverse)) {
        return { ...slidePlank(level, zone, entityAt(zone, slide), path), path };
      }
    }
  }
  throw new Error("there's no mossy slide like that in the level");
}
