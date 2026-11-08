// camera paths (zone_path in src/formats/zdat.h)
import { ByteWriter, padTo4 } from "./bytes";

export const PATH_LINKS_MAX = 4;   // neighbor_paths in zone_path
export const FOLLOW_CAM_MODE = 9;  // a path's cam_mode for the follow camera: along the path, and sideways
                                   // after crash (src/pc/follow.h; the game's own cameras are 0 to 8)

// a path it leads on to (zone_neighbor_path): relation (1 before, 2 after), the
// zone's index in its neighbours, the path's index in that zone, and goal (1 its start, 2 its end)
export type PathLink = [relation: number, zone: number, path: number, goal: number];

// a point: x, y, z in zone units, then the camera's rotation about y, x and z
export type PathPoint = [number, number, number, number, number, number];

export interface CameraPath {
  slst: number;      // its sort list's eid
  points: PathPoint[];
  camMode: number;
  zoom: number;
  averageNodeDistance: number;
  direction?: [number, number, number];
  links?: PathLink[];
  followHeight?: number; // the follow camera's height above crash's floor, in the path's first spare field (src/pc/follow.h)
}

export function pathBytes({ slst, points, camMode, zoom, averageNodeDistance, direction = [0, 0, 0], links = [], followHeight = 0 }: CameraPath): Buffer {
  const writer = new ByteWriter().u32(slst).u32(0).u32(links.length);
  const linkStart = writer.length;
  links.forEach((link) => link.forEach((field) => writer.u8(field)));
  writer.padTo(linkStart + 4 * PATH_LINKS_MAX);
  writer.u8(0).u8(0).u16(points.length).u16(camMode).s16(averageNodeDistance).s16(zoom);
  writer.u16(followHeight).s16(0).s16(0);
  direction.forEach((component) => writer.s16(component));
  points.forEach((point) => point.forEach((field) => writer.s16(field)));
  return padTo4(writer.toBuffer());
}
