// placeholder models for the spawn (crash) and the end (the warp pad), built from
// simple shapes like the enemies' (enemyShapes.ts): in game units, y up,
// standing on the floor, facing +z
import { ball, bothSides, rod, scaledToHeight, standingOnFloor, type ShapePart } from "./enemyShapes";

const CRASH_HEIGHT = 665; // crash's height in game units (MAP_SCALE's comment in builder/makeMap.ts)
const CRASH_COLOURS = { fur: "#e8731e", jeans: "#2c4fa8", shoe: "#d8d8d8", glove: "#3a2a1e", hair: "#c62828", muzzle: "#f2c49b", eye: "#f4f1e0", pupil: "#2e7d32", nose: "#1a1a1a" };

function crashLeg(): ShapePart[] {
  return [rod(35, 35, 160, [50, 120, 0], CRASH_COLOURS.jeans), ball(1, [50, 30, 20], CRASH_COLOURS.shoe, { stretch: [45, 30, 70] })];
}

function crashArm(): ShapePart[] {
  return [rod(22, 22, 170, [100, 300, 0], CRASH_COLOURS.fur, { turn: [0, 0, 0.25] }), ball(35, [120, 205, 0], CRASH_COLOURS.glove)];
}

function crashEye(): ShapePart[] {
  return [ball(26, [35, 515, 80], CRASH_COLOURS.eye), ball(11, [35, 517, 104], CRASH_COLOURS.pupil)];
}

function crashHead(): ShapePart[] {
  return [
    ball(1, [0, 480, 10], CRASH_COLOURS.fur, { stretch: [95, 90, 90] }),
    ball(1, [0, 455, 75], CRASH_COLOURS.muzzle, { stretch: [70, 45, 60] }),
    ball(22, [0, 480, 135], CRASH_COLOURS.nose, { name: "nose" }),
    ...bothSides(crashEye()),
    rod(0, 40, 90, [0, 600, -10], CRASH_COLOURS.hair, { turn: [-0.3, 0, 0] }),
    ...bothSides([rod(0, 30, 70, [40, 585, -20], CRASH_COLOURS.hair, { turn: [-0.3, 0, -0.4] })]),
  ];
}

// crash: orange, in blue jeans, with a red tuft of hair, facing +z
function crash(): ShapePart[] {
  return [
    ...bothSides([...crashLeg(), ...crashArm()]),
    ball(1, [0, 290, 0], CRASH_COLOURS.fur, { stretch: [90, 110, 70] }),
    ...crashHead(),
  ];
}

export const CRASH_SHAPE = scaledToHeight(standingOnFloor(crash()), CRASH_HEIGHT);

const PAD_RADIUS = 400; // the warp pad's radius in game units, about
const PAD_COLOURS = { base: "#8a8f99", ring: "#5aa9e6", glow: "#e8f4ff" };

// the warp pad that ends the level: a round stone base, a blue ring and a glowing middle
export const WARP_PAD_SHAPE: ShapePart[] = [
  rod(PAD_RADIUS, PAD_RADIUS, 60, [0, 30, 0], PAD_COLOURS.base),
  rod(PAD_RADIUS * 0.95, PAD_RADIUS * 0.95, 20, [0, 70, 0], PAD_COLOURS.ring),
  rod(PAD_RADIUS * 0.6, PAD_RADIUS * 0.6, 24, [0, 72, 0], PAD_COLOURS.glow),
];
