// placeholder models for the enemies, built from simple shapes and coloured like the game's:
// in game units, y up, standing on the floor, facing +z (towards the player)
import { Box3, BoxGeometry, BufferGeometry, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import type { EnemyType, Vec3 } from "./objects";

export type Primitive =
  | { kind: "box"; size: Vec3 }
  | { kind: "ball"; radius: number }
  | { kind: "rod"; radiusTop: number; radiusBottom: number; length: number }; // along y; a cone with radiusTop 0

export type ShapePart = Primitive & {
  at: Vec3;
  turn?: Vec3;    // euler angles, in radians
  stretch?: Vec3; // scale along each of the part's own axes
  colour: string;
  name?: string;
};

type ModelledEnemy = Exclude<EnemyType, "rolling_stone">;

const PLANT_COLOURS = { leaf: "#2f7d32", stem: "#4f9a2f", jaw: "#6bb33a", mouth: "#b0233a", tooth: "#f4f1e0", soil: "#6b4a2b" };
const CRAB_COLOURS = { shell: "#9c3a24", claw: "#7e2a1b", leg: "#5e2015", eye: "#f2d36b", pupil: "#1a1a1a" };

const ball = (radius: number, at: Vec3, colour: string, extra: Partial<ShapePart> = {}): ShapePart =>
  ({ kind: "ball", radius, at, colour, ...extra } as ShapePart);

const rod = (radiusTop: number, radiusBottom: number, length: number, at: Vec3, colour: string, extra: Partial<ShapePart> = {}): ShapePart =>
  ({ kind: "rod", radiusTop, radiusBottom, length, at, colour, ...extra } as ShapePart);

// the same parts on the other side (x → -x)
function mirrored(parts: ShapePart[]): ShapePart[] {
  return parts.map((part) => {
    const [x, y, z] = part.at;
    const [turnX, turnY, turnZ] = part.turn ?? [0, 0, 0];
    return { ...part, at: [-x, y, z], turn: [turnX, -turnY, -turnZ] };
  });
}

function bothSides(parts: ShapePart[]): ShapePart[] {
  return [...parts, ...mirrored(parts)];
}

// the plant's leaves, spread around its foot
function plantLeaves(): ShapePart[] {
  const leafCount = 5;
  return Array.from({ length: leafCount }, (_, leafIndex) => {
    const angle = (leafIndex / leafCount) * Math.PI * 2;
    const at: Vec3 = [Math.sin(angle) * 140, 30, Math.cos(angle) * 140];
    return ball(1, at, PLANT_COLOURS.leaf, { stretch: [55, 14, 180], turn: [-0.25, angle, 0] });
  });
}

// a row of teeth along a jaw's edge, pointing up (from the lower jaw) or down (from the upper)
function plantTeeth(height: number, pointingUp: boolean): ShapePart[] {
  const toothCount = 5;
  return Array.from({ length: toothCount }, (_, toothIndex) => {
    const angle = ((toothIndex / (toothCount - 1)) - 0.5) * 2.2;
    const at: Vec3 = [Math.sin(angle) * 115, height, 40 + Math.cos(angle) * 100];
    return rod(0, 12, 34, at, PLANT_COLOURS.tooth, { turn: [pointingUp ? 0 : Math.PI, 0, 0] });
  });
}

// the plant's head: two jaws open towards the player, red inside, with teeth
function plantHead(): ShapePart[] {
  return [
    ball(1, [0, 470, 40], PLANT_COLOURS.jaw, { name: "jaw", stretch: [150, 60, 130], turn: [-0.3, 0, 0] }),
    ball(1, [0, 375, 40], PLANT_COLOURS.jaw, { name: "jaw", stretch: [140, 50, 120], turn: [0.25, 0, 0] }),
    ball(1, [0, 420, 60], PLANT_COLOURS.mouth, { stretch: [115, 40, 95] }),
    ...plantTeeth(445, false),
    ...plantTeeth(395, true),
  ];
}

function plant(): ShapePart[] {
  return [
    rod(95, 110, 24, [0, 12, 0], PLANT_COLOURS.soil),
    ...plantLeaves(),
    rod(26, 38, 340, [0, 190, 0], PLANT_COLOURS.stem),
    ...plantHead(),
  ];
}

// one of the crab's eyes, on its stalk
function crabEye(): ShapePart[] {
  return [
    rod(10, 12, 110, [55, 235, 95], CRAB_COLOURS.shell),
    ball(30, [55, 300, 100], CRAB_COLOURS.eye, { name: "eye" }),
    ball(12, [55, 303, 127], CRAB_COLOURS.pupil),
  ];
}

// one of the crab's claws, out to its side on an arm, its pincers pointing at the player
function crabClaw(): ShapePart[] {
  const forwards: Vec3 = [Math.PI / 2, 0, 0];
  return [
    rod(24, 28, 140, [225, 110, 30], CRAB_COLOURS.claw, { turn: [0, 0, Math.PI / 2] }),
    ball(1, [295, 110, 45], CRAB_COLOURS.claw, { stretch: [55, 45, 65] }),
    rod(0, 30, 110, [295, 135, 125], CRAB_COLOURS.claw, { turn: forwards }),
    rod(0, 26, 95, [295, 88, 118], CRAB_COLOURS.claw, { turn: forwards }),
  ];
}

// the crab's legs on one side, sloping down and out to the floor
function crabLegs(): ShapePart[] {
  return [-70, -10, 50].map((legZ) => rod(8, 16, 150, [215, 55, legZ], CRAB_COLOURS.leg, { turn: [0, 0, 0.9] }));
}

function crab(): ShapePart[] {
  return [
    ball(1, [0, 140, 0], CRAB_COLOURS.shell, { stretch: [215, 120, 160] }),
    ...bothSides([...crabEye(), ...crabClaw(), ...crabLegs()]),
  ];
}

function primitiveGeometry(part: ShapePart): BufferGeometry {
  switch (part.kind) {
    case "box":
      return new BoxGeometry(...part.size);
    case "ball":
      return new SphereGeometry(part.radius, 16, 12);
    case "rod":
      return new CylinderGeometry(part.radiusTop, part.radiusBottom, part.length, 12);
  }
}

function partMatrix(part: ShapePart): Matrix4 {
  const rotation = new Quaternion().setFromEuler(new Euler(...(part.turn ?? [0, 0, 0])));
  return new Matrix4().compose(new Vector3(...part.at), rotation, new Vector3(...(part.stretch ?? [1, 1, 1])));
}

// a part's geometry, placed, turned and stretched (made once for each part, then shared)
const placedGeometries = new Map<ShapePart, BufferGeometry>();
export function partGeometry(part: ShapePart): BufferGeometry {
  let geometry = placedGeometries.get(part);
  if (!geometry) {
    geometry = primitiveGeometry(part).applyMatrix4(partMatrix(part));
    placedGeometries.set(part, geometry);
  }
  return geometry;
}

// the box around all of a shape's parts
export function shapeBounds(parts: ShapePart[]): { min: Vec3; max: Vec3 } {
  const bounds = new Box3();
  for (const part of parts) {
    partGeometry(part).computeBoundingBox();
    bounds.union(partGeometry(part).boundingBox!);
  }
  return { min: bounds.min.toArray(), max: bounds.max.toArray() };
}

// the parts made bigger or smaller (all of them, about the shape's foot), so the shape is height tall
function scaledToHeight(parts: ShapePart[], height: number): ShapePart[] {
  const factor = height / shapeBounds(parts).max[1];
  return parts.map((part) => {
    const [stretchX, stretchY, stretchZ] = part.stretch ?? [1, 1, 1];
    return {
      ...part,
      at: part.at.map((value) => value * factor) as Vec3,
      stretch: [stretchX * factor, stretchY * factor, stretchZ * factor],
    };
  });
}

// the parts moved up or down so the lowest of them is on the floor
function standingOnFloor(parts: ShapePart[]): ShapePart[] {
  const lowest = shapeBounds(parts).min[1];
  return parts.map((part) => ({ ...part, at: [part.at[0], part.at[1] - lowest, part.at[2]] }));
}

// how tall the game's models are, in game units: jungle rollers' plant (JuPcG) and
// n. sanity beach's crab (Cr19G), each vertex times 4, times its tgeo's scale / 4096
const GAME_HEIGHTS: Record<ModelledEnemy, number> = { plant: 720, crab: 480 };

export const ENEMY_SHAPES: Record<ModelledEnemy, ShapePart[]> = {
  plant: scaledToHeight(standingOnFloor(plant()), GAME_HEIGHTS.plant),
  crab: scaledToHeight(standingOnFloor(crab()), GAME_HEIGHTS.crab),
};
