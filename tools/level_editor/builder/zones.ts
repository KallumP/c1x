// zone headers (zone_header in src/formats/zdat.h): the zone's world meshes,
// paths, entities, neighbours and load list
import { ByteWriter, readWords } from "./bytes";
import { EID_NONE } from "./entryIds";
import { PAGE_TEXTURE, type Entry, type Level } from "./levelFiles";
import { pgid } from "./levelWriting";
import type { Vec3 } from "./vectors";

const ZONE_WORLD_SIZE = 64;   // eid, trans, 4 pointers, 8 tpages
const ZONE_WORLDS_MAX = 8;
export const ZONE_PATHS_IDX = 4 + ZONE_WORLDS_MAX * ZONE_WORLD_SIZE; // then path_count, entity_count, neighbor_count
export const ZONE_NEIGHBORS = ZONE_PATHS_IDX + 16;
const ZONE_NEIGHBORS_MAX = 8;
export const ZONE_LOADLIST = ZONE_NEIGHBORS + 32;
const ZONE_DISPLAY_FLAGS = ZONE_LOADLIST + 168;
export const ZONE_MIDI = ZONE_DISPLAY_FLAGS + 4 + 36;
export const ZONE_HEADER_SIZE = 888;
export const ZONE_LOADLIST_PAGES_MAX = 32;

// a world mesh as a zone lists it: its entry and where it is
export interface ZoneWorld {
  eid: number;
  origin: Vec3;
}

export const zoneWorldAt = (index: number) => 4 + index * ZONE_WORLD_SIZE;

// the eids of the world meshes a zone (its entry) lists
export function zoneWorldEids(zone: Entry): number[] {
  const header = zone.items[0];
  return Array.from({ length: header.readUInt32LE(0) }, (_, index) => header.readUInt32LE(zoneWorldAt(index)));
}

// the entities a zone (its entry) holds, which come after its paths in its items
export function zoneEntities(zone: Entry): Buffer[] {
  const [pathsIndex, pathCount, entityCount] = readWords(zone.items[0], ZONE_PATHS_IDX, 3);
  const first = pathsIndex + pathCount;
  return zone.items.slice(first, first + entityCount);
}

// where a zone is, from its collision rect
export function zoneOrigin(zone: Entry): Vec3 {
  const rect = zone.items[1];
  return [rect.readInt32LE(0), rect.readInt32LE(4), rect.readInt32LE(8)];
}

function writeWorlds(header: Buffer, worlds: ZoneWorld[]): void {
  header.writeUInt32LE(worlds.length, 0);
  for (let index = 0; index < ZONE_WORLDS_MAX; index++) {
    const world = worlds[index];
    const slot = world
      ? new ByteWriter().u32(world.eid).s32(world.origin[0]).s32(world.origin[1]).s32(world.origin[2]).padTo(ZONE_WORLD_SIZE).toBuffer()
      : Buffer.alloc(ZONE_WORLD_SIZE);
    slot.copy(header, zoneWorldAt(index));
  }
}

// a zone header from a real one, with the given worlds, its own paths and
// entities, itself and then its neighbours (zone eids) as its neighbours, an
// empty load list and no music
export function zoneHeaderBytes(
  template: Buffer, selfEid: number, worlds: ZoneWorld[], pathCount: number, entityCount: number, neighbors: number[] = [],
): Buffer {
  const header = Buffer.from(template);
  writeWorlds(header, worlds);
  const listed = [selfEid, ...neighbors];
  [2, pathCount, entityCount, listed.length].forEach((value, index) => header.writeUInt32LE(value, ZONE_PATHS_IDX + 4 * index));
  for (let index = 0; index < ZONE_NEIGHBORS_MAX; index++) {
    header.writeUInt32LE(listed[index] ?? 0, ZONE_NEIGHBORS + 4 * index);
  }
  header.fill(0, ZONE_LOADLIST, ZONE_DISPLAY_FLAGS);
  header.writeUInt32LE(0, ZONE_DISPLAY_FLAGS);
  header.writeUInt32LE(EID_NONE, ZONE_MIDI);
  return header;
}

// makes the zone's load list open every texture page in level: LevelUpdate
// opens the pages in it (NSPageOpen), which is what puts a texture page in vram,
// so a texture page nothing opens leaves the models using it blank. page ids
// depend on where pages are, so this is done once they're laid out
export function loadTexturePages(level: Level, zoneEid: number): void {
  const pageIds = level.pages.flatMap((page, index) => (page.type === PAGE_TEXTURE ? [pgid(index)] : []));
  if (pageIds.length > ZONE_LOADLIST_PAGES_MAX) {
    throw new Error(`${pageIds.length} texture pages, more than a load list holds`);
  }
  const zone = level.pages.flatMap((page) => page.entries).find((entry) => entry.eid === zoneEid)!;
  const header = Buffer.from(zone.items[0]);
  header.writeInt32LE(0, ZONE_LOADLIST);
  header.writeInt32LE(pageIds.length, ZONE_LOADLIST + 4);
  for (let index = 0; index < ZONE_LOADLIST_PAGES_MAX; index++) {
    header.writeUInt32LE(pageIds[index] ?? 0, ZONE_LOADLIST + 8 + 32 + 4 * index);
  }
  zone.items[0] = header;
}
