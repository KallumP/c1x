import type { Triangle } from "./overlaps";

// what placing and dragging in the level go by: the grid things snap to
// (0: none), and the level's turn, scale and floor
export interface LevelFrame {
  grid: number;
  turn: number;
  scale: number;
  triangles: Triangle[];
}
