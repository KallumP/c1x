// reading a zone's header, rect and camera paths back field by field, as
// src/formats/zdat.h lays them out (zone_header, zone_rect and zone_path)
import { readWords } from "../../builder/bytes";
import type { PathLink, PathPoint } from "../../builder/paths";
import type { Vec3 } from "../../builder/vectors";
import { ZONE_LOADLIST, ZONE_MIDI, ZONE_NEIGHBORS, ZONE_PATHS_IDX, zoneWorldAt } from "../../builder/zones";

type Rgb = [number, number, number];

// zone_path's fields
const PATH_SLST = 0;
const PATH_LINK_COUNT = 8;
const PATH_LINKS = 12;
const PATH_LINK_SIZE = 4;
const PATH_LENGTH = 30;
const PATH_CAM_MODE = 32;
const PATH_ZOOM = 36;
const PATH_FOLLOW_HEIGHT = 38; // its first spare field (unknown_a)
const PATH_POINTS = 50;
const PATH_POINT_SIZE = 12; // x, y, z, then the camera's rotation about y, x and z

export interface CameraPathFields {
  slst: number;
  links: PathLink[];
  length: number;
  camMode: number;
  zoom: number;
  followHeight: number;
  points: PathPoint[];
}

function readPathLink(path: Buffer, index: number): PathLink {
  const at = PATH_LINKS + PATH_LINK_SIZE * index;
  return [path[at], path[at + 1], path[at + 2], path[at + 3]];
}

function readPathPoint(path: Buffer, index: number): PathPoint {
  const at = PATH_POINTS + PATH_POINT_SIZE * index;
  return [0, 1, 2, 3, 4, 5].map((field) => path.readInt16LE(at + 2 * field)) as PathPoint;
}

export function readCameraPath(path: Buffer): CameraPathFields {
  const length = path.readUInt16LE(PATH_LENGTH);
  return {
    slst: path.readUInt32LE(PATH_SLST),
    links: Array.from({ length: path.readUInt32LE(PATH_LINK_COUNT) }, (_, index) => readPathLink(path, index)),
    length,
    camMode: path.readUInt16LE(PATH_CAM_MODE),
    zoom: path.readInt16LE(PATH_ZOOM),
    followHeight: path.readUInt16LE(PATH_FOLLOW_HEIGHT),
    points: Array.from({ length }, (_, index) => readPathPoint(path, index)),
  };
}

// zone_header's fields. zone_gfx follows the load list and its display flags:
// the sky's split, how far away objects are drawn, and the sky's top and bottom colours
const ZONE_GFX = ZONE_LOADLIST + 168 + 4;
const ZONE_SKY_SPLIT = ZONE_GFX;
const ZONE_VISIBILITY_DEPTH = ZONE_GFX + 8;
const ZONE_SKY_TOP = ZONE_GFX + 44;
const ZONE_SKY_BOTTOM = ZONE_GFX + 48;

export interface ZoneHeaderFields {
  worlds: { eid: number; origin: Vec3 }[];
  pathsIndex: number;  // the item its first camera path is
  pathCount: number;
  entityCount: number;
  neighbours: number[]; // itself first, then the zones either side
  loadList: { entryCount: number; pageCount: number };
  midi: number;
  sky: { split: number; visibility: number; top: Rgb; bottom: Rgb };
}

function readZoneWorld(header: Buffer, index: number) {
  const at = zoneWorldAt(index);
  const origin = [4, 8, 12].map((offset) => header.readInt32LE(at + offset)) as Vec3;
  return { eid: header.readUInt32LE(at), origin };
}

const readRgb = (header: Buffer, at: number): Rgb => [header[at], header[at + 1], header[at + 2]];

export function readZoneHeader(header: Buffer): ZoneHeaderFields {
  const [pathsIndex, pathCount, entityCount, neighbourCount] = readWords(header, ZONE_PATHS_IDX, 4);
  return {
    worlds: Array.from({ length: header.readUInt32LE(0) }, (_, index) => readZoneWorld(header, index)),
    pathsIndex,
    pathCount,
    entityCount,
    neighbours: readWords(header, ZONE_NEIGHBORS, neighbourCount),
    loadList: { entryCount: header.readInt32LE(ZONE_LOADLIST), pageCount: header.readInt32LE(ZONE_LOADLIST + 4) },
    midi: header.readUInt32LE(ZONE_MIDI),
    sky: {
      split: header.readUInt32LE(ZONE_SKY_SPLIT),
      visibility: header.readUInt32LE(ZONE_VISIBILITY_DEPTH),
      top: readRgb(header, ZONE_SKY_TOP),
      bottom: readRgb(header, ZONE_SKY_BOTTOM),
    },
  };
}

// zone_rect: where the zone is, and its size
export interface ZoneRectFields {
  at: Vec3;
  width: number;  // along x
  height: number; // along y
  depth: number;  // along z
}

export function readZoneRect(rect: Buffer): ZoneRectFields {
  const at = [0, 4, 8].map((offset) => rect.readInt32LE(offset)) as Vec3;
  const [width, height, depth] = readWords(rect, 12, 3);
  return { at, width, height, depth };
}
