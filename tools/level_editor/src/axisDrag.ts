// dragging the selected object along one of its axis arrows: x, y (across the
// floor) or up, in blender
import type { Vec3 } from "./objects";

const PARALLEL = 1e-9; // a ray this near along the axis has no one closest point

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// how far along the axis line through origin (axis: a unit direction) the
// pointer's ray comes closest to it; null if the ray runs along the axis. it's
// the closest points of two lines: where the line between them is square to both
export function alongAxis(origin: Vec3, axis: Vec3, rayOrigin: Vec3, rayDirection: Vec3): number | null {
  const between = origin.map((value, index) => value - rayOrigin[index]) as Vec3;
  const axisLength = dot(axis, axis);
  const across = dot(axis, rayDirection);
  const rayLength = dot(rayDirection, rayDirection);
  const square = axisLength * rayLength - across * across;
  if (Math.abs(square) < PARALLEL) {
    return null;
  }
  return (across * dot(rayDirection, between) - rayLength * dot(axis, between)) / square;
}
