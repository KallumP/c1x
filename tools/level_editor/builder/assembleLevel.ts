// a custom level put together from a real one: a chain of zones along the
// route, each with its world meshes, collision, camera path, sort list and
// entities, and the code and textures they need from the real level
import { CORE_EXEC_SLOTS, cutLevel, packEntries } from "./cutLevel";
import { withDonorObjects, type DonorObject } from "./donorObjects";
import { entityType } from "./entities";
import { stringToEid } from "./entryIds";
import { cameraOffsets } from "./route";
import { DEFAULT_CAMERA, type Camera } from "../src/camera";
import { ENTRY_SLST, ENTRY_WGEO, ENTRY_ZDAT, type Entry, type Level, type Page } from "./levelFiles";
import type { BuiltWorld } from "./mapTextures";
import { blocksRectBytes, type Block } from "./octree";
import { FOLLOW_CAM_MODE, pathBytes, type PathLink } from "./paths";
import { zoneSlstItems } from "./slst";
import type { Templates } from "./templates";
import type { Vec3 } from "./vectors";
import { readWorldHeader, worldHeaderBytes, worldPolygonBytes, worldVertexBytes } from "./worldGeometry";
import { loadTexturePages, ZONE_MIDI, zoneHeaderBytes, type ZoneWorld } from "./zones";

export const MAP_CELL = 128; // collision cells
export const LID_TEST = 0x1; // custom levels use the test level id (see src/common.h)

const CAMERA_ROTATION = [-181, 1, 0]; // the camera's rotation at each path point, as on n. sanity beach (its tilt first)
const ANGLE_UNITS = 4096; // a whole turn, in the game's angles
const CAMERA_ZOOM = 1700;
const CAMERA_DIRECTION: [number, number, number] = [0, 0, -4096]; // along -z

// what goes in one zone: its z offset from the first zone's corner, collision
// blocks, world meshes (relative to the zone) and their headers' extra
// texinfos, camera path points relative to the zone (none for zones the camera
// never reaches) and entities
export interface ZonePlan {
  zOffset: number;
  blocks: Block[];
  worlds: BuiltWorld[];
  texinfos: Buffer[];
  points: Vec3[];
  entities: Buffer[];
}

export interface Assembly {
  level: Level;            // the real level
  templates: Templates;
  size: Vec3;              // each zone's
  zones: ZonePlan[];       // the first at the template zone's origin, the rest each along -z from the one before
  step: number;            // between camera path points
  spawnZone: number;       // the zone crash (its first entity) starts in
  pageEids: number[];      // texture pages for the meshes' texinfos
  texturePages: Page[];
  donors: DonorObject[];   // objects taken from other levels, such as enemies jungle rollers doesn't have
  camera?: Camera;         // how the follow camera looks at crash (level.cfg's); as it always was without one
}

// the camera's rotation at each path point: tilted down as much more than the
// usual as its angle is steeper
function cameraRotation(camera: Camera): number[] {
  const tilt = Math.round(((camera.angle - DEFAULT_CAMERA.angle) * ANGLE_UNITS) / 360);
  return [CAMERA_ROTATION[0] - tilt, CAMERA_ROTATION[1], CAMERA_ROTATION[2]];
}

const zonePrefix = (index: number) => `Bm${String(index).padStart(2, "0")}`; // a zone's entries are this and Z, S, W, 1, 2, 3
const zoneEid = (index: number) => stringToEid(`${zonePrefix(index)}Z`);
const worldEid = (zone: number, world: number) => stringToEid(zonePrefix(zone) + (world === 0 ? "W" : String(world)));
const sortListEid = (zone: number) => stringToEid(`${zonePrefix(zone)}S`);

function worldEntries({ templates, zones, pageEids }: Assembly, origins: Vec3[]): Entry[] {
  return zones.flatMap((zone, zoneIndex) => zone.worlds.map((world, index) => ({
    eid: worldEid(zoneIndex, index),
    type: ENTRY_WGEO,
    items: [
      worldHeaderBytes(templates.world.items[0], origins[zoneIndex], world.polygons.length, world.vertices.length, pageEids, zone.texinfos[index]),
      Buffer.concat(world.polygons.map(worldPolygonBytes)),
      Buffer.concat(world.vertices.map(worldVertexBytes)),
    ],
  })));
}

// the zone's neighbours: the zone before and the zone after, where there are
function neighboursOf(zoneIndex: number, zoneCount: number): number[] {
  const before = zoneIndex > 0 ? [zoneEid(zoneIndex - 1)] : [];
  const after = zoneIndex + 1 < zoneCount ? [zoneEid(zoneIndex + 1)] : [];
  return [...before, ...after];
}

// the paths a zone's path leads on to: back to the end of the one before, on to the start of the next
function pathLinks(zones: ZonePlan[], zoneIndex: number, neighbours: number[]): PathLink[] {
  const links: PathLink[] = [];
  if (zoneIndex > 0 && zones[zoneIndex - 1].points.length) {
    links.push([1, 1, 0, 2]);
  }
  const next = zoneIndex + 1;
  if (next < zones.length && zones[next].points.length) {
    links.push([2, neighbours.indexOf(zoneEid(next)) + 1, 0, 1]);
  }
  return links;
}

// a zone's camera path and its sort list, which lists its own meshes and the
// next zone's, as the camera looks on into it
function zonePath(assembly: Assembly, zoneIndex: number, neighbours: number[]): { path: Buffer; sortList: Entry } {
  const { zones, step, camera = DEFAULT_CAMERA } = assembly;
  const zone = zones[zoneIndex];
  const rotation = cameraRotation(camera);
  const next = zones[zoneIndex + 1];
  const listed = zone.worlds.map((world) => ({ ...world, zOffset: 0 }));
  if (next) {
    listed.push(...next.worlds.map((world) => ({ ...world, zOffset: next.zOffset - zone.zOffset })));
  }
  const path = pathBytes({
    slst: sortListEid(zoneIndex),
    points: zone.points.map(([x, y, z]) => [x, y, z, rotation[0], rotation[1], rotation[2]]),
    camMode: FOLLOW_CAM_MODE,
    zoom: CAMERA_ZOOM,
    averageNodeDistance: step,
    direction: CAMERA_DIRECTION,
    links: pathLinks(zones, zoneIndex, neighbours),
    followHeight: cameraOffsets(camera).height,
  });
  const sortList = { eid: sortListEid(zoneIndex), type: ENTRY_SLST, items: zoneSlstItems(listed, zone.points.map(([, , z]) => z), step) };
  return { path, sortList };
}

// a zone's entry (and its sort list's, if it has a path)
function zoneEntries(assembly: Assembly, zoneIndex: number, origins: Vec3[]): Entry[] {
  const { templates, zones, size } = assembly;
  const zone = zones[zoneIndex];
  const neighbours = neighboursOf(zoneIndex, zones.length);
  const listedZones = zones[zoneIndex + 1] ? [zoneIndex, zoneIndex + 1] : [zoneIndex];
  const worlds: ZoneWorld[] = listedZones.flatMap((listed) => zones[listed].worlds.map((_, index) => ({ eid: worldEid(listed, index), origin: origins[listed] })));
  const pathAndList = zone.points.length ? zonePath(assembly, zoneIndex, neighbours) : null;
  const paths = pathAndList ? [pathAndList.path] : [];
  const header = zoneHeaderBytes(templates.header, zoneEid(zoneIndex), worlds, paths.length, zone.entities.length, neighbours);
  const rect = blocksRectBytes(origins[zoneIndex], size, zone.blocks, MAP_CELL);
  const zoneEntry = { eid: zoneEid(zoneIndex), type: ENTRY_ZDAT, items: [header, rect, ...paths, ...zone.entities] };
  return pathAndList ? [pathAndList.sortList, zoneEntry] : [zoneEntry];
}

// what to keep of the real level: the code for crash, the hud, the core objects
// and the entities' types, the texture pages the meshes use, and the zones'
// music (jungle rollers', with its instruments; aku aku's song is its second track)
function keptEids({ level, templates, zones, pageEids }: Assembly): number[] {
  const slots = new Set([...CORE_EXEC_SLOTS, ...zones.flatMap((zone) => zone.entities.map((entity) => entityType(entity)[0]))]);
  const execMap = level.nsd.ldat.execMap;
  const ownPages = readWorldHeader(templates.world.items[0]).pages.filter((page) => page !== 0);
  const music = templates.header.readUInt32LE(ZONE_MIDI);
  return [...[...slots].map((slot) => execMap[slot]), ...ownPages, ...pageEids, music];
}

export function assembleLevel(assembly: Assembly): Level {
  const { templates, zones, spawnZone, texturePages, donors } = assembly;
  const [x0, y0, z0] = templates.origin;
  const origins = zones.map((zone): Vec3 => [x0, y0, z0 + zone.zOffset]);
  const entries = [...worldEntries(assembly, origins), ...zones.flatMap((_, index) => zoneEntries(assembly, index, origins))];
  const out = withDonorObjects(cutLevel(assembly.level, keptEids(assembly)), donors);
  out.pages = [...packEntries(entries), ...out.pages, ...texturePages];
  out.nsd.ldat.lid = LID_TEST;
  out.nsd.ldat.zoneSpawn = zoneEid(spawnZone);
  out.nsd.ldat.pathIndexSpawn = 0;
  zones.forEach((_, index) => loadTexturePages(out, zoneEid(index)));
  return out;
}
