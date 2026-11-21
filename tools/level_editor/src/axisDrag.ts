// dragging the selected object along one of its axis arrows: x, y (across the
// floor) or up, in blender
import type { Vec3 } from "./objects";

// how far along the axis line through origin (axis: a unit direction) the
// pointer's ray comes closest to it; null if the ray runs along the axis
export function alongAxis(_origin: Vec3, _axis: Vec3, _rayOrigin: Vec3, _rayDirection: Vec3): number | null {
  return 0;
}
