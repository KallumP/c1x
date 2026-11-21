// where the editor's camera starts on a level: behind its spawn, looking the
// way the spawn's arrow points (as the game's camera does at the start), from above
import type { LevelObject, Vec3 } from "./objects";

// the camera's spot and what it looks at, in the viewport
export interface View {
  position: Vec3;
  target: Vec3;
}

// where to look at spawn from, for a level turned turn degrees at scale
export function spawnView(_spawn: LevelObject, _turn: number, _scale: number): View {
  return { position: [0, 0, 0], target: [0, 0, 0] };
}
