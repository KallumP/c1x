// a level cut from the game, such as the acid cave (s0000004), read from its
// .nsf alone: its .nsd is an older layout than the builder reads (a page table
// with no level header), but its pages are as the game's other levels'
import { readFileSync } from "node:fs";
import { entityPosition } from "../../builder/entities";
import { eidToString } from "../../builder/entryIds";
import { ENTRY_WGEO, ENTRY_ZDAT, PAGE_SIZE, PAGE_TEXTURE, readPages, type Entry } from "../../builder/levelFiles";
import type { Vec3 } from "../../builder/vectors";
import { readWorldHeader, readWorldPolygon, readWorldVertex, type BuiltPolygon } from "../../builder/worldGeometry";
import type { WorldVertex } from "../../builder/worldMeshes";
import { zoneEntities, zoneOrigin } from "../../builder/zones";

// a world mesh: its vertices are relative to its origin; its header holds its
// texture page slots (pages) and texture infos
export interface CutWorld {
  name: string;
  origin: Vec3;
  header: Buffer;
  pages: number[];
  vertices: WorldVertex[];
  polygons: BuiltPolygon[];
}

// an entity: its type and subtype (the cut level's own numbering), the zone it's
// in, where it is in the level (its zone's origin and its first point), and its init flags
export interface CutEntity {
  type: number;
  subtype: number;
  zone: string;
  at: Vec3;
  flags: [number, number, number];
}

export interface CutLevel {
  worlds: CutWorld[];
  texturePages: Map<number, Buffer>; // each texture page's whole 64 KB, by entry id
  entities: CutEntity[];
}

const ENTITY_FLAGS_AT = 12; // init flags a, b and c (see ENTITY_INIT_FLAGS in builder/entities.ts)
const RECORD_BYTES = 8;     // a world vertex's and polygon's

function records<T>(data: Buffer, count: number, read: (record: Buffer) => T): T[] {
  return Array.from({ length: count }, (_, index) => read(data.subarray(RECORD_BYTES * index, RECORD_BYTES * (index + 1))));
}

function cutWorld(entry: Entry): CutWorld {
  const [header, polygonData, vertexData] = entry.items;
  const { origin, polygonCount, vertexCount, pages } = readWorldHeader(header);
  return {
    name: eidToString(entry.eid),
    origin,
    header,
    pages,
    vertices: records(vertexData, vertexCount, readWorldVertex),
    polygons: records(polygonData, polygonCount, readWorldPolygon),
  };
}

function zoneCutEntities(zone: Entry): CutEntity[] {
  const origin = zoneOrigin(zone);
  return zoneEntities(zone).map((item) => ({
    type: item[18],
    subtype: item[19],
    zone: eidToString(zone.eid),
    at: entityPosition(item).map((value, axis) => value + origin[axis]) as Vec3,
    flags: [0, 1, 2].map((flag) => item.readInt16LE(ENTITY_FLAGS_AT + 2 * flag)) as [number, number, number],
  }));
}

export function readCutLevel(nsfPath: string): CutLevel {
  const nsf = readFileSync(nsfPath);
  const pages = readPages(nsf, nsf.length / PAGE_SIZE);
  const entries = pages.flatMap((page) => page.entries);
  return {
    worlds: entries.filter((entry) => entry.type === ENTRY_WGEO).map(cutWorld),
    texturePages: new Map(pages.filter((page) => page.type === PAGE_TEXTURE).map((page) => [page.eid, page.data])),
    entities: entries.filter((entry) => entry.type === ENTRY_ZDAT).flatMap(zoneCutEntities),
  };
}
