import * as THREE from "three";
import { viewToBlender } from "../coords";
import type { Vec3 } from "../objects";
import type { Triangle } from "../overlaps";

// a spawn object in the map only marks where crash starts (isSpawn in builder/faces.ts)
const isMarker = (mesh: THREE.Object3D) => mesh.name.toLowerCase().startsWith("spawn");

function meshTriangles(mesh: THREE.Mesh): Triangle[] {
  const position = mesh.geometry.getAttribute("position");
  const corner = (vertex: number) => {
    const inWorld = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
    return viewToBlender(inWorld.toArray() as Vec3);
  };
  const triangles: Triangle[] = [];
  for (let first = 0; first + 2 < position.count; first += 3) {
    triangles.push([corner(first), corner(first + 1), corner(first + 2)]);
  }
  return triangles;
}

// the map's triangles (in blender), for finding boxes in walls
export function levelTriangles(group: THREE.Group): Triangle[] {
  group.updateMatrixWorld(true);
  const triangles: Triangle[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && !isMarker(child)) {
      triangles.push(...meshTriangles(child));
    }
  });
  return triangles;
}
