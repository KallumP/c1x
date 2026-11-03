// small meshes for the level build's tests
import type { Mesh, Triangle } from "../../builder/obj";
import type { Vec3 } from "../../builder/vectors";

const triangle = (corners: [number, number, number], object: string | null = null): Triangle =>
  ({ corners, object, material: null });

export const meshOf = (vertices: Vec3[], triangles: Triangle[]): Mesh => ({ vertices, triangles, materialLibraries: [] });

// a mesh of one triangle spanning the box's corners
export function boxMesh(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Mesh {
  return meshOf([[x0, y0, z0], [x1, y0, z0], [x1, y1, z1]], [triangle([0, 1, 2])]);
}

// a mesh of one quad (corners anticlockwise seen from its front)
export function quadMesh(corners: Vec3[], object: string | null = null): Mesh {
  return meshOf(corners, [triangle([0, 1, 2], object), triangle([0, 2, 3], object)]);
}

// an upward facing quad
export function floorMesh(x0: number, z0: number, x1: number, z1: number, y: number, object: string | null = null): Mesh {
  return quadMesh([[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]], object);
}

export function merged(...meshes: Mesh[]): Mesh {
  const vertices: Vec3[] = [];
  const triangles: Triangle[] = [];
  for (const mesh of meshes) {
    const offset = vertices.length;
    for (const { corners, object, material } of mesh.triangles) {
      const shifted = corners.map((corner) => corner + offset) as [number, number, number];
      triangles.push({ corners: shifted, object, material });
    }
    vertices.push(...mesh.vertices);
  }
  return meshOf(vertices, triangles);
}
