import { useMemo } from "react";
import type * as THREE from "three";
import type { LevelObject } from "../objects";
import { overlappingBoxes, type Triangle } from "../overlaps";
import { strayingPaths } from "../pathWarnings";
import { levelTriangles } from "../three/levelTriangles";

// the level's triangles (blender), none until it's loaded
export function useTriangles(group: THREE.Group | null): Triangle[] {
  return useMemo(() => (group ? levelTriangles(group) : []), [group]);
}

// the path enemies whose paths leave the floor or run through a wall
export function usePathWarnings(objects: LevelObject[], turn: number, scale: number, triangles: Triangle[]): Set<number> {
  return useMemo(() => strayingPaths(objects, turn, scale, triangles), [objects, turn, scale, triangles]);
}

// the boxes in a wall or another box
export function useWarnings(objects: LevelObject[], scale: number, triangles: Triangle[]): Set<number> {
  return useMemo(() => overlappingBoxes(objects, scale, triangles), [objects, scale, triangles]);
}
