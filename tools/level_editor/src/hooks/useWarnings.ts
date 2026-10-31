import { useMemo } from "react";
import type * as THREE from "three";
import type { LevelObject } from "../objects";
import { overlappingBoxes } from "../overlaps";
import { levelTriangles } from "../three/levelTriangles";

// the boxes in a wall or another box
export function useWarnings(objects: LevelObject[], scale: number, group: THREE.Group | null): Set<number> {
  const triangles = useMemo(() => (group ? levelTriangles(group) : []), [group]);
  return useMemo(() => overlappingBoxes(objects, scale, triangles), [objects, scale, triangles]);
}
