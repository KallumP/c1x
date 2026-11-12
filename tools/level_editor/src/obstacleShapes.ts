// placeholder models for the obstacles, as the enemies' (src/enemyShapes.ts):
// in game units, y up, on their spot, coloured like the game's
import { ball, rod, type ShapePart } from "./enemyShapes";
import type { ObstacleType, Vec3 } from "./objects";

const LILY_PAD_COLOURS = { leaf: "#2f6b2a", bud: "#c8b83a" };
const LEAF_COLOURS = { leaf: "#2e7a2c", vein: "#1f4f1e", stalk: "#6b5a2a" };
const PEG_COLOURS = { log: "#8a5a32", end: "#c89a5e" };
const SPIKED_LOG_COLOURS = { log: "#7a5530", spike: "#d8d0b8", arrow: "#ffd23a" };
const FIRE_PIT_COLOURS = { bowl: "#b8321e", rim: "#e0a030", flame: "#ff8a1f" };
const PILLAR_COLOURS = { stone: "#5c5a50", moss: "#4f6b3a" };
const GATE_COLOURS = { post: "#9a6a3a", rail: "#7a5230" };
const STEAM_COLOURS = { grate: "#3a3a40", steam: "#e8ecf0" };
const SPRING_COLOURS = { base: "#3a3a40", coil: "#8a8a90", pad: "#a83a2a" };
const RUINS_COLOURS = { stone: "#4a5560", carving: "#7a3a2a", platform: "#5a4a48" };

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

const SPIKED_LOG_RADIUS = 250;
const SPIKE_LENGTH = { across: 150, along: 120 }; // out of its sides, across the map and along it
const SPIKE_GAP = 450;       // between rings of spikes up the log
const SPIKED_LOG_TIP = 200;  // its top, a spike
const RISING_LOG_TOP = 1700; // how far a rising log's top comes up out of the floor
const FALLING_LOG_HEIGHT = 2800;

// a ring of four spikes round a spiked log, height up it
function spikeRing(height: number): ShapePart[] {
  const reach = (length: number) => SPIKED_LOG_RADIUS + length / 2;
  const spike = (at: Vec3, turn: Vec3, length: number) => rod(0, 60, length, at, SPIKED_LOG_COLOURS.spike, { turn });
  return [
    spike([reach(SPIKE_LENGTH.across), height, 0], [0, 0, -Math.PI / 2], SPIKE_LENGTH.across),
    spike([-reach(SPIKE_LENGTH.across), height, 0], [0, 0, Math.PI / 2], SPIKE_LENGTH.across),
    spike([0, height, reach(SPIKE_LENGTH.along)], [Math.PI / 2, 0, 0], SPIKE_LENGTH.along),
    spike([0, height, -reach(SPIKE_LENGTH.along)], [-Math.PI / 2, 0, 0], SPIKE_LENGTH.along),
  ];
}

type PushWay = "up" | "down";

const ARROW = { gap: 250, shaft: 350, shaftRadius: 70, head: 300, headRadius: 200 }; // over a spiked log
const POINT_RADIUS = SPIKED_LOG_RADIUS * 0.6;

// a spiked log's point: on top of its body (from bottom) pointing up, or under it pointing down
function logPoint(way: PushWay, bottom: number): ShapePart {
  if (way === "up") {
    return { ...rod(0, POINT_RADIUS, SPIKED_LOG_TIP, [0, bottom + SPIKED_LOG_TIP / 2, 0], SPIKED_LOG_COLOURS.spike), name: "point" };
  }
  return { ...rod(POINT_RADIUS, 0, SPIKED_LOG_TIP, [0, SPIKED_LOG_TIP / 2, 0], SPIKED_LOG_COLOURS.spike), name: "point" };
}

// an arrow's shaft and head, each middle at its height (up from the floor)
const arrowShaft = (height: number): ShapePart =>
  ({ ...rod(ARROW.shaftRadius, ARROW.shaftRadius, ARROW.shaft, [0, height, 0], SPIKED_LOG_COLOURS.arrow), name: "arrow" });
const arrowHead = (height: number, turn: Vec3): ShapePart =>
  ({ ...rod(0, ARROW.headRadius, ARROW.head, [0, height, 0], SPIKED_LOG_COLOURS.arrow, { turn }), name: "arrow" });

// an arrow from above a spiked log (above, its top) pointing the way it pushes:
// up, its head over its shaft, or down, its head under it
function pushArrow(way: PushWay, above: number): ShapePart[] {
  const bottom = above + ARROW.gap;
  if (way === "up") {
    return [arrowShaft(bottom + ARROW.shaft / 2), arrowHead(bottom + ARROW.shaft + ARROW.head / 2, [0, 0, 0])];
  }
  return [arrowHead(bottom + ARROW.head / 2, [Math.PI, 0, 0]), arrowShaft(bottom + ARROW.head + ARROW.shaft / 2)];
}

// how far up a spiked log's body starts: over its point, if that's at its bottom
function logBodyBottom(way: PushWay): number {
  if (way === "down") {
    return SPIKED_LOG_TIP;
  }
  return 0;
}

// the great gate's spiked log (SL1iG), standing on the floor at its spot and
// height tall, at the far end of its push: an upright log 800 across with
// rings of spikes up it, its point the way it pushes (up at its top, or down
// on the floor), and an arrow over it pointing that way
function spikedLog(height: number, way: PushWay): ShapePart[] {
  const body = height - SPIKED_LOG_TIP;
  const bodyBottom = logBodyBottom(way);
  const ringCount = Math.floor((body - SPIKE_GAP / 2) / SPIKE_GAP);
  const rings = Array.from({ length: ringCount }, (_, ring) => spikeRing(bodyBottom + (ring + 1) * SPIKE_GAP)).flat();
  return [
    rod(SPIKED_LOG_RADIUS, SPIKED_LOG_RADIUS, body, [0, bodyBottom + body / 2, 0], SPIKED_LOG_COLOURS.log),
    logPoint(way, body),
    ...rings,
    ...pushArrow(way, height),
  ];
}

// the great gate's fire pit (WT1iG), by its vertices: a dish 494 across, 40 to
// 239 over its spot and 300 to 650 out towards the player from it, on stems
// down to the floor (68 under its spot) at 8 and 793 out
const FIRE_PIT = { radius: 247, dishBottom: 40, top: 239, rim: 30, middle: 475, dishLong: 350, floor: -68, stems: [33, 768], stemTop: 100 }; // stems their radius in from the ends (8 and 793)
const STEM_RADIUS = 25;

function firePit(): ShapePart[] {
  const { radius, dishBottom, top, rim, middle, dishLong, floor, stems, stemTop } = FIRE_PIT;
  const oval = { stretch: [1, 1, dishLong / (2 * radius)] as Vec3 };
  const dishHeight = top - rim - dishBottom;
  const stem = (along: number): ShapePart => rod(STEM_RADIUS, STEM_RADIUS, stemTop - floor, [0, (stemTop + floor) / 2, along], FIRE_PIT_COLOURS.rim);
  return [
    rod(radius, radius * 0.5, dishHeight, [0, dishBottom + dishHeight / 2, middle], FIRE_PIT_COLOURS.bowl, oval),
    rod(radius, radius, rim, [0, top - rim / 2, middle], FIRE_PIT_COLOURS.rim, oval),
    rod(radius * 0.8, radius * 0.8, 4, [0, top - 2, middle], FIRE_PIT_COLOURS.flame, oval),
    ...stems.map(stem),
  ];
}

const PILLAR = { across: 1209, long: 1148, height: 2407, moss: 60 };

// boulder dash's pillar (PlPeG): a stone column 1209 across and 1148 long, its
// mossy top at its spot, reaching 2407 down
function pillar(): ShapePart[] {
  const stretch = { stretch: [1, 1, PILLAR.long / PILLAR.across] as Vec3 };
  const radius = PILLAR.across / 2;
  const stone = PILLAR.height - PILLAR.moss;
  return [
    rod(radius, radius * 0.9, stone, [0, -PILLAR.moss - stone / 2, 0], PILLAR_COLOURS.stone, stretch),
    rod(radius, radius, PILLAR.moss, [0, -PILLAR.moss / 2, 0], PILLAR_COLOURS.moss, stretch),
  ];
}

const TALL_GATE = { across: 903, tall: 1554, deep: 246, post: 160, plank: 150 };
const LOW_GATE = { across: 2377, tall: 437, deep: 284, stumps: 6 };

// boulder dash's tall thin gate (JB4eG), standing on its spot: an upright
// post 1554 tall, two planks nailed across it, 903 wide
function tallThinGate(): ShapePart[] {
  const { across, tall, deep, post, plank } = TALL_GATE;
  const plankAt = (height: number): ShapePart =>
    ({ kind: "box", size: [across, plank, deep * 0.5], at: [0, height, deep * 0.25], colour: GATE_COLOURS.rail });
  return [
    { kind: "box", size: [post, tall, deep * 0.5], at: [0, tall / 2, -deep * 0.25], colour: GATE_COLOURS.post },
    plankAt(tall * 0.55),
    plankAt(tall * 0.85),
  ];
}

// boulder dash's low wide gate (JB3eG), standing on its spot: a row of short
// log stumps 437 tall, 2377 wide
function lowWideGate(): ShapePart[] {
  const { across, tall, deep, stumps } = LOW_GATE;
  const width = across / stumps;
  return Array.from({ length: stumps }, (_, stump): ShapePart => (
    { kind: "box", size: [width * 0.9, tall, deep], at: [-across / 2 + width * (stump + 0.5), tall / 2, 0], colour: GATE_COLOURS.post }
  ));
}

const FALL_ARROW = { gap: 150, shaft: 450, shaftWidth: 90, head: 250, headRadius: 170, thick: 20 };

// an arrow flat on the floor, from deep (a gate's depth) out in front of it,
// pointing towards the player: the way boulder dash's gates fall when knocked
function fallArrow(deep: number): ShapePart[] {
  const { gap, shaft, shaftWidth, head, headRadius, thick } = FALL_ARROW;
  const start = deep / 2 + gap;
  const shaftPart: ShapePart = { kind: "box", size: [shaftWidth, thick, shaft], at: [0, thick / 2, start + shaft / 2], colour: SPIKED_LOG_COLOURS.arrow };
  const headPart = rod(0, headRadius, head, [0, thick / 2, start + shaft + head / 2], SPIKED_LOG_COLOURS.arrow, { turn: [Math.PI / 2, 0, 0], stretch: [1, 1, thick / headRadius] });
  return [{ ...shaftPart, name: "arrow" }, { ...headPart, name: "arrow" }];
}

const PUSHING_BLOCK = { across: 800, tall: 1600, out: 2000 };
const PUSHING_PLATFORM = { across: 741, top: -28, bottom: -206, near: -37, out: 1800 };

// sunset vista's pushing block (Rp7wG), pushed out: a stone block 800 across
// and 1600 tall, 2000 out towards the player from its spot, two panels on its face
function pushingBlock(): ShapePart[] {
  const { across, tall, out } = PUSHING_BLOCK;
  const block: ShapePart = { kind: "box", size: [across, tall, out], at: [0, tall / 2, out / 2], colour: RUINS_COLOURS.stone };
  const seam: ShapePart = { kind: "box", size: [across + 10, 40, out + 10], at: [0, tall / 2, out / 2], colour: RUINS_COLOURS.carving };
  return [block, seam];
}

// sunset vista's long pushing platform (Rw3wG), pushed out: a stone slab 741
// across, its top just under its spot, reaching 1800 out towards the player
function pushingPlatform(): ShapePart[] {
  const { across, top, bottom, near, out } = PUSHING_PLATFORM;
  return [{ kind: "box", size: [across, top - bottom, out - near], at: [0, (top + bottom) / 2, (out + near) / 2], colour: RUINS_COLOURS.platform }];
}

// sunset vista's rotating pot (Rp3wG): a stone pot 806 across and 794 long,
// hanging 719 down from its spot
function rotatingPot(): ShapePart[] {
  return [rod(403, 300, 719, [0, -360, 397], RUINS_COLOURS.stone, { stretch: [1, 1, 794 / 806] })];
}

// sunset vista's rotating platform (Rw1wG): a stone slab 742 across, 172 thick,
// just under its spot, reaching 1000 out towards the player
function rotatingPlatform(): ShapePart[] {
  return [{ kind: "box", size: [742, 172, 1039], at: [0, -117, 480], colour: RUINS_COLOURS.platform }];
}

const SLAMMING_WALL = { across: 1200, tall: 1031, deep: 606 };
const WALL_COLOURS = { stone: "#8a6a3a", face: "#5a3a20" };

// temple ruins' slamming walls (RcLsG and RcRsG), shut: two carved stone halves
// 1200 across and 1031 tall, meeting at their spot
function slammingWalls(): ShapePart[] {
  const { across, tall, deep } = SLAMMING_WALL;
  const half = (way: number): ShapePart => ({ kind: "box", size: [across - 20, tall, deep], at: [(way * across) / 2, tall / 2, 0], colour: WALL_COLOURS.stone });
  const face = (way: number): ShapePart => ({ kind: "box", size: [across / 3, tall / 3, 10], at: [(way * across) / 2, tall / 2, deep / 2], colour: WALL_COLOURS.face });
  return [half(-1), half(1), face(-1), face(1)];
}

const RISING_PILLAR = { across: 953, height: 3203, cap: 120 };

// temple ruins' rising pillar (PlUsG): a stone column 953 across, its capped
// top at its spot, reaching 3203 down (it rises 1600 from there and back)
function risingPillar(): ShapePart[] {
  const { across, height, cap } = RISING_PILLAR;
  const radius = across / 2;
  return [
    rod(radius * 0.8, radius * 0.8, height - cap, [0, -cap - (height - cap) / 2, 0], PILLAR_COLOURS.stone),
    rod(radius, radius, cap, [0, -cap / 2, 0], PILLAR_COLOURS.moss),
  ];
}

// temple ruins' carrying platform (PlPsG): a short stone column 794 across,
// its mossy top at its spot, 481 down
function carryingPlatform(): ShapePart[] {
  return [
    rod(397, 330, 421, [0, -60 - 421 / 2, 0], PILLAR_COLOURS.stone),
    rod(397, 397, 60, [0, -30, 0], PILLAR_COLOURS.moss),
  ];
}

const BOUNCE_PAD = { across: 722, height: 175, base: 40, pad: 50 };

// a square slab across wide and high tall, its bottom bottom up from the spot
const squareSlab = (across: number, high: number, bottom: number, colour: string): ShapePart =>
  ({ kind: "box", size: [across, high, across], at: [0, bottom + high / 2, 0], colour });

// castle machinery's bounce pad (PoSpG): a square spring 722 across, standing
// 175 tall on its spot: a metal base, a coil and a red pad on top
function bouncePad(): ShapePart[] {
  const { across, height, base, pad } = BOUNCE_PAD;
  const coil = height - base - pad;
  return [
    squareSlab(across, base, 0, SPRING_COLOURS.base),
    squareSlab(across * 0.6, coil, base, SPRING_COLOURS.coil),
    squareSlab(across, pad, height - pad, SPRING_COLOURS.pad),
  ];
}

const STEAM_VENT = { across: 500, grate: 40, steam: 1600 };

// castle machinery's steam vent, which has no model (its pipe is its level's):
// a square grate 500 across on its spot, and its steam, a square column 1600 up from it
function steamVent(): ShapePart[] {
  const { across, grate, steam } = STEAM_VENT;
  return [
    squareSlab(across, grate, 0, STEAM_COLOURS.grate),
    squareSlab(across * 0.6, steam - grate, grate, STEAM_COLOURS.steam),
  ];
}

const MOVING_PLATFORM = { across: 802, deep: 797, thick: 403, moss: 60 };

// slippery climb's moving platform (PlPyG): a square stone slab 802 x 797
// across, its mossy top at its spot, 403 thick
function movingPlatform(): ShapePart[] {
  const { across, deep, thick, moss } = MOVING_PLATFORM;
  const stone = thick - moss;
  return [
    { kind: "box", size: [across, stone, deep], at: [0, -moss - stone / 2, 0], colour: PILLAR_COLOURS.stone },
    { kind: "box", size: [across, moss, deep], at: [0, -moss / 2, 0], colour: PILLAR_COLOURS.moss },
  ];
}

// sunset vista's dropping platform (Rw2wG): its rotating platform's slab
const droppingPlatform = rotatingPlatform;

const FALLING_PLATFORM = { across: 969, deep: 444 };

// the lost city's falling platform (PlDwG): a square carved slab 969 across,
// its top at its spot, 444 deep
function fallingPlatform(): ShapePart[] {
  const { across, deep } = FALLING_PLATFORM;
  return [squareSlab(across, deep, -deep, RUINS_COLOURS.stone)];
}

const SEESAW_BLOCK = { across: 600, high: 600, out: 800 };
const SEESAW_BLOCKS_AT = [-1600, -800, 800, 1600];

// sunset vista's seesaw (its first's layout): four stone blocks (Rp4wG, 600
// across and high, 800 out from their wall), two either side of its spot
function seesaw(): ShapePart[] {
  const { across, high, out } = SEESAW_BLOCK;
  return SEESAW_BLOCKS_AT.map((x) => ({ kind: "box", size: [across, high, out], at: [x, -high / 2, out / 2], colour: RUINS_COLOURS.stone }));
}

// the obstacles with a model: all but the rolling stone and mossy slide, drawn as their track and slope
export type ModelledObstacle = Exclude<ObstacleType, "rolling_stone" | "mossy_slide">;

export const OBSTACLE_SHAPES: Record<ModelledObstacle, ShapePart[]> = { lily_pad: lilyPad(), leaf: leaf(), wooden_peg: woodenPeg(), rising_spiked_log: spikedLog(RISING_LOG_TOP, "up"), falling_spiked_log: spikedLog(FALLING_LOG_HEIGHT, "down"), fire_pit: firePit(), dropping_pillar: pillar(), sliding_pillar: pillar(),
  tall_thin_gate: [...tallThinGate(), ...fallArrow(TALL_GATE.deep)], low_wide_gate: [...lowWideGate(), ...fallArrow(LOW_GATE.deep)],
  pushing_block: pushingBlock(), pushing_platform: pushingPlatform(),
  rotating_pots: rotatingPot(), rotating_platforms: rotatingPlatform(),
  slamming_walls: slammingWalls(), rising_pillar: risingPillar(), carrying_platform: carryingPlatform(), bounce_pad: bouncePad(), steam_vent: steamVent(), moving_platform: movingPlatform(), dropping_platform: droppingPlatform(), falling_platform: fallingPlatform(), seesaw: seesaw() };
