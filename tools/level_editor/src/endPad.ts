// the end pad (the warp pad that ends the level): how high it's raised so its
// base shows over the floor around it
import { PAD_RADIUS } from "./markerShapes";
import { floorAbove, floorBelow, type Triangle } from "./overlaps";
import type { LevelObject, Vec3 } from "./objects";

export const END_PAD_LIFT = 128; // game units over the floor a pad's raised to: its base only reaches 16 over where it stands

const RINGS = [0.5, 1];  // the floor's checked on these rings round the pad, as shares of its radius
const DIRECTIONS = 8;    // at this many points round each ring

interface Sample { point: Vec3; distance: number }

// the points round the pad (blender) the floor's checked at, each with how far it is from the pad
function samplesRound(at: Vec3, radius: number): Sample[] {
  return RINGS.flatMap((ring) =>
    Array.from({ length: DIRECTIONS }, (_, index) => {
      const angle = (index / DIRECTIONS) * 2 * Math.PI;
      const distance = ring * radius;
      return { point: [at[0] + distance * Math.cos(angle), at[1] + distance * Math.sin(angle), at[2]] as Vec3, distance };
    }),
  );
}

// how far the floor at point is over it (under it if less than 0), or null if there's no floor there
function floorRise(point: Vec3, triangles: Triangle[]): number | null {
  const above = floorAbove(point, triangles);
  if (above !== null) {
    return above;
  }
  const below = floorBelow(point, triangles);
  if (below !== null) {
    return -below;
  }
  return null;
}

// floor rising more than it's far from the pad (steeper than 45 degrees) is a wall beside it, not floor under it
const isFloorUnderPad = (rise: number | null, distance: number): rise is number => rise !== null && rise <= distance;

const roundToMillimetre = (metres: number) => Math.round(metres * 1000) / 1000;

// how far to raise an end pad at at (blender, on the floor) so its base shows
// over the highest floor within its radius: END_PAD_LIFT over it, in metres
// for a level at scale
export function endPadRaise(at: Vec3, scale: number, triangles: Triangle[]): number {
  const rises = samplesRound(at, PAD_RADIUS / scale)
    .map(({ point, distance }) => ({ rise: floorRise(point, triangles), distance }))
    .filter(({ rise, distance }) => isFloorUnderPad(rise, distance))
    .map(({ rise }) => rise as number);
  const highest = Math.max(0, ...rises);
  return roundToMillimetre(highest + END_PAD_LIFT / scale);
}

// object as placed: an end pad raised to clear the floor round it; anything else as it is
export function raisedEndPad(object: LevelObject, scale: number, triangles: Triangle[]): LevelObject {
  if (object.kind !== "end") {
    return object;
  }
  return { ...object, raise: endPadRaise(object.at, scale, triangles) };
}

// changes dragging object makes: an end pad moved is raised for where it's moved to
export function withEndPadRaise(object: LevelObject, changes: Partial<LevelObject>, scale: number, triangles: Triangle[]): Partial<LevelObject> {
  if (object.kind !== "end" || !changes.at) {
    return changes;
  }
  return { ...changes, raise: endPadRaise(changes.at, scale, triangles) };
}
