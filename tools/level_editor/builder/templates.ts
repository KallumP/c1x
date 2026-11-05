// what custom levels take from a real level (the base level): its spawn zone's
// header and origin, crash, its biggest world mesh (for textures), an example of
// each kind of entity, the base the warp pad stands on, and a rolling stone's track
import { BOX_TYPE, CRASH, ENEMY_ENTITIES, entityPath, entityPosition, entityType, WARP_PAD, withInitFlagA, withSubtype } from "./entities";
import { ENTRY_ZDAT, entriesById, type Entry, type Level } from "./levelFiles";
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
// the other (the path runs 3600 along -x), with the skirts under it. it shares
// its texture pages with the ground around it, so it's cut out by this box
const AROUND_TRACK: Box = { low: [-4640, -1900, -350], high: [1030, 100, 460] };

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
    const stone = zoneEntities(zone).find((item) => entityType(item).join() === ENEMY_ENTITIES.rolling_stone.join());
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
