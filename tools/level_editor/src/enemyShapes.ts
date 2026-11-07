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
const TURTLE_COLOURS = { shell: "#b8282a", spot: "#2fa58c", skin: "#b5a35a", eye: "#f4f1e0", pupil: "#1a1a1a" };
const NATIVE_COLOURS = { skin: "#8a5a3a", skirt: "#46c84a", hair: "#2b1b14", shield: "#8e2416", eye: "#f4f1e0", pupil: "#1a1a1a" };
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

const TURTLE_SHELL = { at: [0, 175, -20] as Vec3, stretch: [330, 165, 470] as Vec3 };

// a green spot on the turtle's shell, set into it where a line from its middle,
// leaning by up (from flat) and round (from +z), comes out
function turtleSpot(up: number, round: number): ShapePart {
  const { at, stretch } = TURTLE_SHELL;
  const way = [Math.cos(up) * Math.sin(round), Math.sin(up), Math.cos(up) * Math.cos(round)];
  const onShell = at.map((value, axis) => value + 0.96 * stretch[axis] * way[axis]) as Vec3;
  return ball(1, onShell, TURTLE_COLOURS.spot, { stretch: [70, 70, 70] });
}

function turtleShell(): ShapePart[] {
  const ring = [0, 1, 2, 3, 4, 5].map((spotIndex) => turtleSpot(0.55, (spotIndex / 6) * Math.PI * 2 + Math.PI / 6));
  return [ball(1, TURTLE_SHELL.at, TURTLE_COLOURS.shell, { stretch: TURTLE_SHELL.stretch }), turtleSpot(Math.PI / 2, 0), ...ring];
}

// the turtle's head, poking out of the front of its shell, with its eyes
function turtleHead(): ShapePart[] {
  return [
    rod(55, 65, 170, [0, 150, 455], TURTLE_COLOURS.skin, { turn: [Math.PI / 2 - 0.3, 0, 0] }),
    ball(1, [0, 185, 560], TURTLE_COLOURS.skin, { name: "head", stretch: [85, 75, 100] }),
    ...bothSides([
      ball(24, [40, 215, 630], TURTLE_COLOURS.eye),
      ball(10, [42, 218, 652], TURTLE_COLOURS.pupil),
    ]),
  ];
}

// the turtle's legs on one side, front and back, splayed out under its shell
function turtleLegs(): ShapePart[] {
  return [250, -260].map((legZ) => ball(1, [290, 55, legZ], TURTLE_COLOURS.skin, { stretch: [130, 55, 80], turn: [0, legZ > 0 ? -0.5 : 0.5, 0] }));
}

function turtle(): ShapePart[] {
  return [
    ...turtleShell(),
    ...turtleHead(),
    ...bothSides(turtleLegs()),
    rod(0, 30, 110, [0, 90, -520], TURTLE_COLOURS.skin, { turn: [-Math.PI / 2, 0, 0] }),
  ];
}

// the native's legs and bare feet, one side
function nativeLeg(): ShapePart[] {
  return [
    rod(28, 26, 300, [60, 170, 0], NATIVE_COLOURS.skin),
    ball(1, [60, 20, 25], NATIVE_COLOURS.skin, { stretch: [40, 22, 60] }),
  ];
}

// the native's head: its face, its hair over the top and back, and its eyes
function nativeHead(): ShapePart[] {
  return [
    ball(85, [0, 890, 0], NATIVE_COLOURS.skin),
    ball(1, [0, 935, -20], NATIVE_COLOURS.hair, { stretch: [100, 75, 100] }),
    ...bothSides([
      ball(16, [32, 900, 76], NATIVE_COLOURS.eye),
      ball(7, [33, 902, 90], NATIVE_COLOURS.pupil),
    ]),
  ];
}

// the native's arms, reaching forwards to hold its shield up in front of it
function nativeArm(): ShapePart[] {
  return [rod(26, 24, 300, [215, 660, 140], NATIVE_COLOURS.skin, { turn: [Math.PI / 2 - 0.4, 0, 0.15] })];
}

function native(): ShapePart[] {
  return [
    ...bothSides([...nativeLeg(), ...nativeArm()]),
    rod(110, 180, 280, [0, 440, 0], NATIVE_COLOURS.skirt),
    ball(1, [0, 660, 0], NATIVE_COLOURS.skin, { stretch: [150, 170, 95] }),
    ...nativeHead(),
    { kind: "box", size: [300, 430, 30], at: [40, 600, 345], colour: NATIVE_COLOURS.shield, name: "shield" },
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
// n. sanity beach's crab (Cr19G) and turtle (Tu19G), and the great gate's native
// (Na1iG, its first frame in Na1iV), each vertex times 4, times its tgeo's scale / 4096
const GAME_HEIGHTS: Record<ModelledEnemy, number> = { plant: 720, crab: 480, turtle: 370, native: 925 };

export const ENEMY_SHAPES: Record<ModelledEnemy, ShapePart[]> = {
  plant: scaledToHeight(standingOnFloor(plant()), GAME_HEIGHTS.plant),
  crab: scaledToHeight(standingOnFloor(crab()), GAME_HEIGHTS.crab),
  turtle: scaledToHeight(standingOnFloor(turtle()), GAME_HEIGHTS.turtle),
  native: scaledToHeight(standingOnFloor(native()), GAME_HEIGHTS.native),
};
