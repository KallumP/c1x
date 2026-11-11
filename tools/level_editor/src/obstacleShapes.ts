// placeholder models for the obstacles, as the enemies' (src/enemyShapes.ts):
// in game units, y up, on their spot, coloured like the game's
import { ball, rod, type ShapePart } from "./enemyShapes";
import type { ObstacleType, Vec3 } from "./objects";

const LILY_PAD_COLOURS = { leaf: "#2f6b2a", bud: "#c8b83a" };
const LEAF_COLOURS = { leaf: "#2e7a2c", vein: "#1f4f1e", stalk: "#6b5a2a" };
const PEG_COLOURS = { log: "#8a5a32", end: "#c89a5e" };
const SPIKED_LOG_COLOURS = { log: "#7a5530", spike: "#d8d0b8" };

// one of a lily pad's four round leaves, x and z out from its middle
const lilyPadLeaf = (x: number, z: number) => ball(1, [x, 50, z], LILY_PAD_COLOURS.leaf, { stretch: [270, 50, 270] });

// up the creek's lily pad (Rl1fG): four round leaves about a bud, 1066 across and flat
function lilyPad(): ShapePart[] {
  return [
    lilyPadLeaf(260, 0), lilyPadLeaf(-260, 0), lilyPadLeaf(0, 260), lilyPadLeaf(0, -260),
    ball(1, [0, 70, 0], LILY_PAD_COLOURS.bud, { stretch: [90, 45, 90] }),
  ];
}

// up the creek's floating leaf (RB1fG): a long flat leaf, 856 across and 1281
// long, its vein along it and its stalk curling up from its back end
function leaf(): ShapePart[] {
  return [
    ball(1, [0, 60, 0], LEAF_COLOURS.leaf, { stretch: [428, 60, 640] }),
    { kind: "box", size: [24, 12, 1200], at: [0, 116, 0], colour: LEAF_COLOURS.vein },
    rod(20, 34, 380, [0, 230, -520], LEAF_COLOURS.stalk, { turn: [-0.45, 0, 0] }),
  ];
}

// one of a wooden peg's two logs, x across from its middle: along +z (out
// towards the player) from its spot, flattened to the peg's thickness, its end lighter
function pegLog(x: number): ShapePart[] {
  const flat = { turn: [Math.PI / 2, 0, 0] as Vec3, stretch: [1, 1, 0.62] as Vec3 };
  return [
    rod(186, 186, 1131, [x, 0, 565], PEG_COLOURS.log, flat),
    rod(150, 150, 10, [x, 0, 1131], PEG_COLOURS.end, flat),
  ];
}

// the great gate's wooden peg (WP1iG) flipped out as a step, as crash stands on
// it: two logs side by side, 744 across, sticking 1131 out from its spot
// towards the player, its middle at its spot's height
function woodenPeg(): ShapePart[] {
  return [...pegLog(-186), ...pegLog(186)];
}

// the great gate's spiked log (SL1iG): an upright log 2800 tall and 800 thick,
// its middle at its spot, spikes sticking out of its sides
function spikedLog(): ShapePart[] {
  const spikeHeights = [-900, -300, 300, 900];
  const spikes = spikeHeights.flatMap((y) => [
    rod(0, 90, 220, [470, y, 0], SPIKED_LOG_COLOURS.spike, { turn: [0, 0, -Math.PI / 2] }),
    rod(0, 90, 220, [-470, y, 0], SPIKED_LOG_COLOURS.spike, { turn: [0, 0, Math.PI / 2] }),
  ]);
  return [rod(370, 370, 2800, [0, 0, 0], SPIKED_LOG_COLOURS.log), ...spikes];
}

// the obstacles with a model: all but the rolling stone and mossy slide, drawn as their track and slope
export type ModelledObstacle = Exclude<ObstacleType, "rolling_stone" | "mossy_slide">;

export const OBSTACLE_SHAPES: Record<ModelledObstacle, ShapePart[]> = { lily_pad: lilyPad(), leaf: leaf(), wooden_peg: woodenPeg(), rising_spiked_log: spikedLog(), falling_spiked_log: spikedLog() };
