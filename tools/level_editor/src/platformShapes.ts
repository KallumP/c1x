// placeholder models for the platforms, as the enemies' (src/enemyShapes.ts):
// in game units, y up, on their spot, coloured like the game's
import { ball, rod, type ShapePart } from "./enemyShapes";
import type { PlatformType } from "./objects";

const LILY_PAD_COLOURS = { leaf: "#2f6b2a", bud: "#c8b83a" };
const LEAF_COLOURS = { leaf: "#2e7a2c", vein: "#1f4f1e", stalk: "#6b5a2a" };

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

export const PLATFORM_SHAPES: Record<PlatformType, ShapePart[]> = { lily_pad: lilyPad(), leaf: leaf() };
