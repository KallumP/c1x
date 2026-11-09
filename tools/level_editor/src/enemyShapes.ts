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
  turnOrder?: "XYZ" | "YXZ"; // the order turn's angles apply in (three's Euler order): XYZ unless given
  colour: string;
  name?: string;
};

type ModelledEnemy = Exclude<EnemyType, "rolling_stone">;
type StandingEnemy = Exclude<ModelledEnemy, "spider" | "bat">; // all but the spider hanging on its thread and the flying bat

const PLANT_COLOURS = { leaf: "#2f7d32", stem: "#4f9a2f", jaw: "#6bb33a", mouth: "#b0233a", tooth: "#f4f1e0", soil: "#6b4a2b" };
const TURTLE_COLOURS = { shell: "#b8282a", spot: "#2fa58c", skin: "#b5a35a", eye: "#f4f1e0", pupil: "#1a1a1a" };
const NATIVE_COLOURS = { skin: "#8a5a3a", skirt: "#46c84a", hair: "#2b1b14", shield: "#8e2416", eye: "#f4f1e0", pupil: "#1a1a1a" };
const WARTHOG_COLOURS = { hide: "#7a4a32", mane: "#3a2a20", snout: "#b07a64", tusk: "#f2ecd8", eye: "#1a1a1a" };
const MONKEY_COLOURS = { fur: "#6b4226", face: "#d9b48a", eye: "#1a1a1a" };
const SPIDER_COLOURS = { body: "#3b2a4a", leg: "#2a1d36", eye: "#e8d44d", thread: "#e6e6e6" };
const BADGER_COLOURS = { fur: "#1f1d24", stripe: "#e4dcc4", nose: "#3a3238", eye: "#f4f1e0", pupil: "#1a1a1a" };
const RIVER_PLANT_COLOURS = { jaw: "#b0233a", tooth: "#f4f1e0" };
const RIVER_PLANT_LEAVES = { blue: "#4a6478", green: "#2f7d32" };
const FISH_COLOURS = { body: "#23306e", fin: "#e08a2a", eye: "#f4f1e0", pupil: "#1a1a1a" };
const BAT_COLOURS = { body: "#3a2c34", wing: "#5a3a3e", ear: "#2a1e26", eye: "#f2d36b" };
const CRAB_COLOURS = { shell: "#9c3a24", claw: "#7e2a1b", leg: "#5e2015", eye: "#f2d36b", pupil: "#1a1a1a" };

export const ball = (radius: number, at: Vec3, colour: string, extra: Partial<ShapePart> = {}): ShapePart =>
  ({ kind: "ball", radius, at, colour, ...extra } as ShapePart);

export const rod = (radiusTop: number, radiusBottom: number, length: number, at: Vec3, colour: string, extra: Partial<ShapePart> = {}): ShapePart =>
  ({ kind: "rod", radiusTop, radiusBottom, length, at, colour, ...extra } as ShapePart);

// the same parts on the other side (x → -x)
function mirrored(parts: ShapePart[]): ShapePart[] {
  return parts.map((part) => {
    const [x, y, z] = part.at;
    const [turnX, turnY, turnZ] = part.turn ?? [0, 0, 0];
    return { ...part, at: [-x, y, z], turn: [turnX, -turnY, -turnZ] };
  });
}

export function bothSides(parts: ShapePart[]): ShapePart[] {
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

// a part turned about the plant's middle (y) by angle, from facing +z: its own
// turn first (such as a petal's tip up), then this one (Euler order YXZ)
function turnedAbout(part: ShapePart, angle: number): ShapePart {
  const [x, y, z] = part.at;
  const [turnX, turnY, turnZ] = part.turn ?? [0, 0, 0];
  const at: Vec3 = [x * Math.cos(angle) + z * Math.sin(angle), y, z * Math.cos(angle) - x * Math.sin(angle)];
  return { ...part, at, turn: [turnX, turnY + angle, turnZ], turnOrder: "YXZ" };
}

// a part tipped up about a level line across the plant (along x) at height
// and depth pivot, so what's further along +z rises by angle
function tippedUp(part: ShapePart, angle: number, [pivotY, pivotZ]: [number, number]): ShapePart {
  const [x, y, z] = part.at;
  const [up, along] = [y - pivotY, z - pivotZ];
  const [turnX, turnY, turnZ] = part.turn ?? [0, 0, 0];
  const at: Vec3 = [x, pivotY + up * Math.cos(angle) + along * Math.sin(angle), pivotZ + along * Math.cos(angle) - up * Math.sin(angle)];
  return { ...part, at, turn: [turnX - angle, turnY, turnZ] };
}

// how far a river plant's petals rise from the floor, in radians: the two
// towards the player lie open, almost flat; the one behind rears up, as the game shows them
const OPEN_PETAL_TILT = 0.12;
const REARING_PETAL_TILT = 0.3;

const PETAL_LENGTH = 370; // half a petal's length, along it
const PETAL_WIDTH = 170;  // half its width
const PETAL_MIDDLE = 550; // how far its middle is out from the plant's

// the teeth standing round a petal's rim, pointing up out of it
function petalTeeth(): ShapePart[] {
  const alongs = [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75];
  return alongs.flatMap((along) => [-1, 1].map((side) => {
    const across = side * PETAL_WIDTH * 0.85 * Math.sqrt(1 - along * along);
    return rod(0, 14, 60, [across, 130, PETAL_MIDDLE + along * PETAL_LENGTH], RIVER_PLANT_COLOURS.tooth);
  }));
}

// a river plant's petal pointing along +z: a low red jaw, open, its teeth
// standing round its rim, tipped up from the plant's middle by tilt
function riverPlantPetal(tilt: number): ShapePart[] {
  const petal = [
    ball(1, [0, 70, PETAL_MIDDLE], RIVER_PLANT_COLOURS.jaw, { name: "jaw", stretch: [PETAL_WIDTH, 70, PETAL_LENGTH] }),
    ...petalTeeth(),
  ];
  return petal.map((part) => tippedUp(part, tilt, [70, 130]));
}

// a green bit pointing along +z, lying on the floor and curling up at its end
function riverPlantLeaf(leafColour: string): ShapePart[] {
  return [
    ball(1, [0, 40, 340], leafColour, { name: "leaf", stretch: [60, 20, 260], turn: [-0.2, 0, 0] }),
    ball(1, [0, 220, 640], leafColour, { name: "leaf", stretch: [55, 18, 200], turn: [-1.0, 0, 0] }),
  ];
}

const THIRD_TURN = (Math.PI * 2) / 3;

// up the creek's biting plant: three red petals with teeth, a third of a turn
// apart round a red bud in its middle (two towards the player lying open, the
// one behind rearing up), with leaves, blue or green, between them
function riverPlant(leafColour: string): ShapePart[] {
  const petals = [
    { angle: Math.PI, tilt: REARING_PETAL_TILT },
    { angle: Math.PI + THIRD_TURN, tilt: OPEN_PETAL_TILT },
    { angle: Math.PI - THIRD_TURN, tilt: OPEN_PETAL_TILT },
  ];
  const petalAngles = petals.map(({ angle }) => angle);
  return [
    ...petals.flatMap(({ angle, tilt }) => riverPlantPetal(tilt).map((part) => turnedAbout(part, angle))),
    ...petalAngles.flatMap((angle) => riverPlantLeaf(leafColour).map((part) => turnedAbout(part, angle + Math.PI))),
    ball(1, [0, 150, 0], RIVER_PLANT_COLOURS.jaw, { name: "bud", stretch: [150, 150, 150] }),
  ];
}

// one side of the fish: a fin out to the side and an eye
function fishSide(): ShapePart[] {
  return [
    ball(1, [140, 280, 20], FISH_COLOURS.fin, { stretch: [80, 20, 60] }),
    ball(25, [80, 380, 150], FISH_COLOURS.eye, { name: "eye" }),
    ball(10, [95, 382, 170], FISH_COLOURS.pupil),
  ];
}

// up the creek's fish: a tall dark body, orange fins and tail, facing +z
function fish(): ShapePart[] {
  return [
    ...bothSides(fishSide()),
    ball(1, [0, 290, 0], FISH_COLOURS.body, { stretch: [110, 200, 190] }),
    ball(1, [0, 300, -200], FISH_COLOURS.fin, { stretch: [20, 110, 60] }),
    ball(1, [0, 500, -20], FISH_COLOURS.fin, { stretch: [15, 80, 90] }),
    ball(1, [0, 90, -40], FISH_COLOURS.fin, { stretch: [15, 60, 60] }),
  ];
}

// one side of the bat: a wing raised up from its shoulder, an ear, an eye and a claw hanging down
function batSide(): ShapePart[] {
  return [
    { kind: "box", size: [20, 280, 260], at: [55, 330, -10], turn: [0, 0, -0.2], colour: BAT_COLOURS.wing },
    rod(0, 18, 60, [25, 415, 30], BAT_COLOURS.ear),
    ball(12, [20, 362, 82], BAT_COLOURS.eye, { name: "eye" }),
    rod(8, 8, 160, [25, 80, 0], BAT_COLOURS.ear),
  ];
}

// temple ruins' bat: a dark body and head, its wings raised over it, facing +z
function bat(): ShapePart[] {
  return [
    ...bothSides(batSide()),
    ball(1, [0, 250, 0], BAT_COLOURS.body, { stretch: [60, 95, 70] }),
    ball(45, [0, 350, 40], BAT_COLOURS.body),
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

function badgerLeg(): ShapePart[] {
  return [rod(35, 30, 100, [150, 50, 220], BADGER_COLOURS.fur), rod(35, 30, 100, [150, 50, -120], BADGER_COLOURS.fur)];
}

function badgerEye(): ShapePart[] {
  return [ball(22, [55, 230, 540], BADGER_COLOURS.eye), ball(10, [57, 232, 560], BADGER_COLOURS.pupil)];
}

function badgerHead(): ShapePart[] {
  return [
    ball(1, [0, 190, 420], BADGER_COLOURS.fur, { stretch: [130, 110, 150], name: "head" }),
    ball(45, [0, 170, 575], BADGER_COLOURS.nose, { name: "head" }),
    ...bothSides([...badgerEye(), ball(1, [70, 290, 400], BADGER_COLOURS.fur, { stretch: [30, 40, 20], name: "head" })]),
  ];
}

// jungle rollers' badger (a skunk): low and long, black with a pale stripe and a big bushy tail held up behind
function badger(): ShapePart[] {
  return [
    ...bothSides(badgerLeg()),
    ball(1, [0, 170, 60], BADGER_COLOURS.fur, { stretch: [280, 130, 330] }),
    ball(1, [0, 260, 60], BADGER_COLOURS.stripe, { stretch: [70, 45, 300] }),
    ...badgerHead(),
    ball(1, [0, 220, -420], BADGER_COLOURS.stripe, { stretch: [110, 160, 130], turn: [0.4, 0, 0], name: "tail" }),
  ];
}

function warthogLegs(): ShapePart[] {
  return [rod(30, 26, 140, [90, 70, 230], WARTHOG_COLOURS.hide), rod(30, 26, 140, [90, 70, -230], WARTHOG_COLOURS.hide)];
}

function warthogHeadSide(): ShapePart[] {
  return [
    rod(0, 18, 90, [60, 300, 600], WARTHOG_COLOURS.tusk, { turn: [-0.6, 0, 0.3] }),
    ball(14, [70, 350, 520], WARTHOG_COLOURS.eye),
    ball(1, [75, 420, 400], WARTHOG_COLOURS.mane, { stretch: [25, 45, 20] }),
  ];
}

function warthogHead(): ShapePart[] {
  return [
    ball(1, [0, 310, 420], WARTHOG_COLOURS.hide, { stretch: [120, 120, 150] }),
    ball(1, [0, 260, 570], WARTHOG_COLOURS.snout, { stretch: [70, 60, 55], name: "snout" }),
    ...bothSides(warthogHeadSide()),
  ];
}

// road to nowhere's warthog: a long brown body on short legs, a dark mane, and tusks, facing +z
function warthog(): ShapePart[] {
  return [
    ...bothSides(warthogLegs()),
    ball(1, [0, 270, 0], WARTHOG_COLOURS.hide, { stretch: [175, 150, 380] }),
    ball(1, [0, 410, 0], WARTHOG_COLOURS.mane, { stretch: [40, 70, 320] }),
    ...warthogHead(),
    rod(12, 6, 120, [0, 330, -430], WARTHOG_COLOURS.mane, { turn: [-0.8, 0, 0] }),
  ];
}

function monkeySide(): ShapePart[] {
  return [
    rod(35, 30, 180, [80, 90, 0], MONKEY_COLOURS.fur),
    rod(28, 24, 330, [220, 380, 60], MONKEY_COLOURS.fur, { turn: [0, 0, 0.35] }),
    ball(40, [250, 230, 80], MONKEY_COLOURS.face),
    ball(40, [125, 610, 10], MONKEY_COLOURS.face),
    ball(14, [40, 610, 140], MONKEY_COLOURS.eye, { name: "face" }),
  ];
}

// the great gate's monkey: a round brown body on short legs, long arms, a pale face and a tail, facing +z
function monkey(): ShapePart[] {
  return [
    ...bothSides(monkeySide()),
    ball(1, [0, 330, 0], MONKEY_COLOURS.fur, { stretch: [150, 170, 130] }),
    ball(1, [0, 320, 110], MONKEY_COLOURS.face, { stretch: [100, 120, 40] }),
    ball(1, [0, 590, 20], MONKEY_COLOURS.fur, { stretch: [120, 115, 115] }),
    ball(1, [0, 575, 115], MONKEY_COLOURS.face, { stretch: [85, 75, 40], name: "face" }),
    rod(18, 12, 360, [0, 280, -300], MONKEY_COLOURS.fur, { turn: [-1.0, 0, 0] }),
  ];
}

// a spider's legs on one side, sloping down and out from its body, front to back
function spiderLegs(): ShapePart[] {
  return [200, 70, -70, -200].map((z) => rod(18, 14, 380, [280, 130, z], SPIDER_COLOURS.leg, { turn: [0, 0, 1.14] }));
}

// fumbling in the dark's spider: a round body, a smaller head with yellow eyes, and eight legs, facing +z
function spiderBody(): ShapePart[] {
  return [
    ...bothSides(spiderLegs()),
    ball(1, [0, 200, -170], SPIDER_COLOURS.body, { stretch: [180, 140, 270] }),
    ball(1, [0, 190, 180], SPIDER_COLOURS.body, { stretch: [130, 110, 130], name: "head" }),
    ...bothSides([ball(25, [45, 230, 290], SPIDER_COLOURS.eye, { name: "head" })]),
  ];
}

const SPIDER_HANG = 1613; // how high the spider's bottom hangs before it drops: SpDsV's first frame
const SPIDER_THREAD = 600; // how far its thread is drawn up above it

// parts lifted up off the floor by height
const lifted = (parts: ShapePart[], height: number): ShapePart[] =>
  parts.map((part) => ({ ...part, at: [part.at[0], part.at[1] + height, part.at[2]] }));

// the spider hanging at the height it drops from, on a thread up from its body
function hangingSpider(body: ShapePart[]): ShapePart[] {
  const top = SPIDER_HANG + shapeBounds(body).max[1];
  return [...lifted(body, SPIDER_HANG), rod(6, 6, SPIDER_THREAD, [0, top + SPIDER_THREAD / 2, 0], SPIDER_COLOURS.thread, { name: "thread" })];
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
  const rotation = new Quaternion().setFromEuler(new Euler(...(part.turn ?? [0, 0, 0]), part.turnOrder));
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
export function scaledToHeight(parts: ShapePart[], height: number): ShapePart[] {
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
export function standingOnFloor(parts: ShapePart[]): ShapePart[] {
  const lowest = shapeBounds(parts).min[1];
  return parts.map((part) => ({ ...part, at: [part.at[0], part.at[1] - lowest, part.at[2]] }));
}

// how tall the game's models are, in game units: jungle rollers' plant (JuPcG) and
// n. sanity beach's crab (Cr19G) and turtle (Tu19G), and the great gate's native
// (Na1iG, its first frame in Na1iV), jungle rollers' badger (Pi10G, its first
// frame in Pi10V), and road to nowhere's warthog (WartG, its first frame in
// WarHV), fumbling in the dark's walking spider (Sp1sG, its first frame in
// Sp1sV), the great gate's monkey (Mo1fG, its first frame in Mo3fV), and up the
// creek's river plants (RV1fG and Rv1fG, their first frames in RV1fV and Rv1fV)
// and fish (RF1fG, its first frame in RF1fV), each vertex times 4, times its
// tgeo's scale / 4096
// a river plant's height: its first frame in the game (RV1fV) rears its back
// petal up 602, but the editor's lies lower, so it's as tall as makes it as wide
// as the game's (about 1570 across)
const RIVER_PLANT_HEIGHT = 400;

const GAME_HEIGHTS: Record<StandingEnemy, number> = {
  plant: 720, crab: 480, turtle: 370, native: 925, badger: 345, warthog: 490, walking_spider: 356, monkey: 782,
  blue_river_plant: RIVER_PLANT_HEIGHT, green_river_plant: RIVER_PLANT_HEIGHT, fish: 581,
};

const SHAPE_PARTS: Record<StandingEnemy, () => ShapePart[]> = {
  plant, crab, turtle, native, badger, warthog, walking_spider: spiderBody, monkey,
  blue_river_plant: () => riverPlant(RIVER_PLANT_LEAVES.blue), green_river_plant: () => riverPlant(RIVER_PLANT_LEAVES.green), fish,
};

// each standing enemy's shape, on the floor, as tall as the game's model
const STANDING_SHAPES = Object.fromEntries(Object.entries(SHAPE_PARTS).map(([enemy, parts]) =>
  [enemy, scaledToHeight(standingOnFloor(parts()), GAME_HEIGHTS[enemy as StandingEnemy])])) as Record<StandingEnemy, ShapePart[]>;

// temple ruins' bat (Ba1sG, its first frame in Ba1sV): its height, and how far
// below its spot its lowest point is, in game units, as the game's
const BAT_HEIGHT = 567;
const BAT_BELOW_SPOT = 361;

// each enemy's shape: the standing ones', the spider hanging as the walking
// spider's body, and the bat about its spot as the game's
export const ENEMY_SHAPES: Record<ModelledEnemy, ShapePart[]> = {
  ...STANDING_SHAPES,
  spider: hangingSpider(STANDING_SHAPES.walking_spider),
  bat: lifted(scaledToHeight(standingOnFloor(bat()), BAT_HEIGHT), -BAT_BELOW_SPOT),
};
