// what custom levels take from a real level (the base level): its spawn zone's
// header and origin, crash, its biggest world mesh (for textures), an example of
// each kind of entity, and the base the warp pad stands on
import { BOX_TYPE, entityPosition, entityType, withSubtype, WARP_PAD, CRASH } from "./entities";
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

// the level's first entity of a type and subtype; a box of a subtype the level
// has none of (such as the ! box in jungle rollers) is its basic box with that
// subtype, as boxes differ only by subtype
function exampleEntity(examples: Map<string, Buffer>, type: number, subtype: number): Buffer {
  const example = examples.get(`${type},${subtype}`);
  if (example || type !== BOX_TYPE) {
    return example!;
  }
  return withSubtype(examples.get(`${BOX_TYPE},${BASIC_BOX}`)!, subtype);
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

// the warp pad's base

const WARP_PAD_REACH = 700; // how far around the warp pad (zone units) its base can go

// the base the warp pad stands on, which is part of the terrain: its vertices
// relative to where the pad stands, polygons (with texinfos, on one page), the
// texinfos they use (8 bytes each) and the texture page they're on
export interface WarpPadBase {
  vertices: WorldVertex[];
  polygons: { corners: [number, number, number]; texinfo: number }[];
  texinfos: Map<number, Buffer>;
  page: number;
}

// a mesh's vertices relative to the pad
function verticesAroundPad(world: Entry, pad: Vec3): WorldVertex[] {
  const header = readWorldHeader(world.items[0]);
  const vertices = world.items[2];
  return Array.from({ length: header.vertexCount }, (_, index) => {
    const { at, colour } = readWorldVertex(vertices.subarray(8 * index, 8 * index + 8));
    return { at: [0, 1, 2].map((axis) => at[axis] + header.origin[axis] - pad[axis]) as Vec3, colour };
  });
}

// the texture page slots only the polygons all around the pad use
function slotsOnlyAroundPad(polygons: BuiltPolygon[], vertices: WorldVertex[]): number[] {
  const isAround = (polygon: BuiltPolygon) => polygon.corners.every((index) => {
    const [x, y, z] = vertices[index].at;
    return Math.abs(x) <= WARP_PAD_REACH && Math.abs(z) <= WARP_PAD_REACH && y >= -WARP_PAD_REACH && y <= 64;
  });
  const slots = [...new Set(polygons.filter(isAround).map(({ page }) => page))].sort((first, second) => first - second);
  return slots.filter((slot) => polygons.filter(({ page }) => page === slot).every(isAround));
}

// the base in a world mesh around the pad (where it stands, zone units), or null
function worldWarpPadBase(world: Entry, pad: Vec3): WarpPadBase | null {
  const vertices = verticesAroundPad(world, pad);
  const polygons = polygonsOf(world).slice(0, readWorldHeader(world.items[0]).polygonCount);
  const slots = slotsOnlyAroundPad(polygons, vertices);
  if (slots.length !== 1) {
    return null;
  }
  const mine = polygons.filter(({ page }) => page === slots[0]);
  const used = [...new Set(mine.flatMap(({ corners }) => corners))].sort((first, second) => first - second);
  const newIndex = new Map(used.map((vertex, index) => [vertex, index]));
  const header = world.items[0];
  const texinfos = new Map(mine.map(({ texinfo }) => [texinfo, header.subarray(TEXINFOS_AT + 4 * texinfo, TEXINFOS_AT + 4 * texinfo + 8)]));
  return {
    vertices: used.map((index) => vertices[index]),
    polygons: mine.map(({ corners, texinfo }) => ({ corners: corners.map((corner) => newIndex.get(corner)!) as [number, number, number], texinfo })),
    texinfos,
    page: readWorldHeader(header).pages[slots[0]],
  };
}

// the warp pad's base in level (the base level): the polygons of the world
// mesh under its warp pad on the texture pages only the base uses, which are
// those all around the pad
export function warpPadBase(level: Level): WarpPadBase {
  const entries = entriesById(level);
  for (const zone of zonesOf(level)) {
    for (const item of zoneEntities(zone)) {
      if (entityType(item).join() !== WARP_PAD.join()) {
        continue;
      }
      const origin = zoneOrigin(zone);
      const pad = entityPosition(item).map((offset, axis) => origin[axis] + offset) as Vec3;
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
