// where the editor's camera starts on a level: behind its spawn, looking the
// way the spawn's arrow points (as the game's camera does at the start), from above
import { blenderToView, cameraFacing } from "./coords";
import type { LevelObject, Vec3 } from "./objects";

// how far behind the spawn and above it the camera is, in game units: about one
// and a half times as far as the game's own camera (1450 behind and 1316 above), to see round it
const BEHIND = 2900;
const ABOVE = 2600;

// the camera's spot and what it looks at, in the viewport
export interface View {
  position: Vec3;
  target: Vec3;
}

// where to look at spawn from, for a level turned turn degrees at scale
export function spawnView(spawn: LevelObject, turn: number, scale: number): View {
  const [x, y, z] = spawn.at;
  const spot: Vec3 = [x, y, z + spawn.raise];
  const facing = cameraFacing(turn);
  const behind = spot.map((value, axis) => value - (facing[axis] * BEHIND) / scale) as Vec3;
  behind[2] += ABOVE / scale;
  return { position: blenderToView(behind), target: blenderToView(spot) };
}
