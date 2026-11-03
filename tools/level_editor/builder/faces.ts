// a map's faces: which way they face, and what their object's name makes them
import type { Mesh, Triangle } from "./obj";
import { cross, subtract, type Vec3 } from "./vectors";

export const FACING = 0.5; // a face whose normal's y is over this faces up (under -FACING, down)

export function cornersOf(mesh: Mesh, triangle: Triangle): [Vec3, Vec3, Vec3] {
  const [a, b, c] = triangle.corners;
  return [mesh.vertices[a], mesh.vertices[b], mesh.vertices[c]];
}

// a triangle's unit normal (out of its front, which is anticlockwise), or null if it's flat
export function normal(mesh: Mesh, triangle: Triangle): Vec3 | null {
  const [a, b, c] = cornersOf(mesh, triangle);
  const [x, y, z] = cross(subtract(b, a), subtract(c, a));
  const length = Math.sqrt(x * x + y * y + z * z);
  return length === 0 ? null : [x / length, y / length, z / length];
}

export const facesUp = (facing: Vec3) => facing[1] > FACING;
export const facesDown = (facing: Vec3) => facing[1] < -FACING;

const objectNameStarts = (triangle: Triangle, prefix: string) =>
  (triangle.object ?? "").toLowerCase().startsWith(prefix);

// faces of an object named pit... kill crash
export const isPit = (triangle: Triangle) => objectNameStarts(triangle, "pit");

// faces of an object named spawn... only mark where crash starts
export const isSpawn = (triangle: Triangle) => objectNameStarts(triangle, "spawn");
