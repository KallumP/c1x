import { describe, expect, test } from "vitest";
import { BARREL_SHAPE, ENEMY_SHAPES, partGeometry, shapeBounds } from "../../src/enemyShapes";
import { expectNear } from "../helpers";

type EnemyShapeName = keyof typeof ENEMY_SHAPES;
type Range = [number, number];

// a shape's size in game units: its bottom and top (how far below and above its
// spot), and how wide it is across (x) and long front to back (z)
type ShapeSize = { enemy: EnemyShapeName; bottom: number; top: number; across: Range; long?: Range };

function expectWithin(value: number, [low, high]: Range): void {
  expect(value).toBeGreaterThan(low);
  expect(value).toBeLessThan(high);
}

// the parts of an enemy's shape with a name
const partsNamed = (enemy: EnemyShapeName, name: string) => ENEMY_SHAPES[enemy].filter((part) => part.name === name);

describe("enemy shapes", () => {
  // the sizes of the game's models: jungle rollers' JuPcG and Pi10V, n. sanity beach's Cr19G and
  // Tu19G, the great gate's Na1iV and Mo1fG, road to nowhere's WarHV, fumbling in the dark's Sp1sV,
  // up the creek's RV1fV and RF1fV, temple ruins' Ba1sG, sunset vista's Ba2wG, the lost city's
  // LizgG and LizrG, stormy ascent's LW1EG, temple ruins' cobra JuPsG (its first frame in JupsV), heavy machinery's robot dog PRS1G (its first frame in PRSSV, at its 0.75 scale), toxic waste's barrel roller Fat1G (its first frame in FaS1V, without the barrel he holds out), cortex power's gunman SlimG (standing, SliMV), the lost city's walking lizard Ig1wG (its first frame in Ig1wV), castle machinery's camera robot PRE1G (its spikes too, its first frame in PRESV), slippery climb's bird Cb1yG (wings spread, Cb1yV frame 6), and the lab's walking lab assistant Ls1FG (walking, LW1FV); a bat's spot is above its lowest point, as the game's
  // (a river plant's petals are lower than the game's first frame rears its back one, 602)
  test.each<ShapeSize>([
    { enemy: "plant", bottom: 0, top: 720, across: [760, 900] },
    { enemy: "crab", bottom: 0, top: 480, across: [900, 1060] },
    { enemy: "turtle", bottom: 0, top: 370, across: [650, 800], long: [1080, 1280] },
    { enemy: "native", bottom: 0, top: 925, across: [420, 540], long: [470, 600] },
    { enemy: "badger", bottom: 0, top: 345, across: [470, 600], long: [1020, 1230] },
    { enemy: "warthog", bottom: 0, top: 490, across: [300, 420], long: [1000, 1200] },
    { enemy: "walking_spider", bottom: 0, top: 356, across: [850, 1100], long: [820, 1070] },
    { enemy: "monkey", bottom: 0, top: 782, across: [560, 730], long: [600, 780] },
    { enemy: "blue_river_plant", bottom: 0, top: 400, across: [1400, 1750], long: [1500, 1900] },
    { enemy: "fish", bottom: 0, top: 581, across: [370, 500], long: [370, 500] },
    { enemy: "bat", bottom: -361, top: 206, across: [180, 270], long: [250, 350] },
    { enemy: "leader_bats", bottom: -262, top: 132, across: [420, 520], long: [240, 350] },
    { enemy: "lizard", bottom: 0, top: 763, across: [560, 700], long: [880, 1080] },
    { enemy: "red_lizard", bottom: 0, top: 763, across: [560, 700], long: [880, 1080] },
    { enemy: "lab_assistant", bottom: 0, top: 1203, across: [340, 460], long: [470, 610] },
    { enemy: "snake", bottom: 0, top: 558, across: [240, 320], long: [230, 310] },
    { enemy: "robot_dog", bottom: 0, top: 557, across: [620, 750], long: [630, 770] },
    { enemy: "barrel_roller", bottom: 0, top: 1069, across: [850, 1100], long: [550, 760] },
    { enemy: "gunman", bottom: 0, top: 1181, across: [450, 560], long: [360, 470] },
    { enemy: "walking_lizard", bottom: 0, top: 419, across: [600, 720], long: [1150, 1340] },
    { enemy: "camera_robot", bottom: 0, top: 469, across: [640, 730], long: [640, 730] },
    { enemy: "bird", bottom: 0, top: 450, across: [2150, 2400], long: [1400, 1600] },
    { enemy: "electric_scientist", bottom: 0, top: 1180, across: [440, 600], long: [500, 820] },
  ])("the $enemy is as big as the game's, the same both sides", ({ enemy, bottom, top, across, long }) => {
    const { min, max } = shapeBounds(ENEMY_SHAPES[enemy]);
    expect(min[1]).toBeCloseTo(bottom);
    expect(max[1]).toBeCloseTo(top, -1);
    expectWithin(max[0] - min[0], across);
    if (long) {
      expectWithin(max[2] - min[2], long);
    }
    expectNear(min[0] + max[0], 0, 0.005);
  });

  test.each([
    ["plant", "jaw"],
    ["crab", "eye"],
    ["turtle", "head"],
    ["native", "shield"],
    ["badger", "head"],
    ["warthog", "snout"],
    ["spider", "head"],
    ["walking_spider", "head"],
    ["monkey", "face"],
    ["fish", "eye"],
    ["bat", "eye"],
    ["leader_bats", "eye"],
    ["lizard", "eye"],
    ["red_lizard", "eye"],
    ["lab_assistant", "eye"],
    ["snake", "eye"],
    ["robot_dog", "eye"],
    ["barrel_roller", "eye"],
    ["gunman", "eye"],
    ["walking_lizard", "eye"],
    ["bird", "eye"],
    ["electric_scientist", "eye"],
  ] as const)("the %s faces +z: its %s is in front of its middle", (enemy, front) => {
    const parts = partsNamed(enemy, front);
    expect(parts.length).toBeGreaterThan(0);
    expect(parts.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("a barrel roller's barrel lies on its side, as big as toxic waste's", () => {
    // BaV7G: 595 along its axis, which lies across (x), 370 high, 389 across it
    const { min, max } = shapeBounds(BARREL_SHAPE);
    expect(min[1]).toBeCloseTo(0);
    expectWithin(max[0] - min[0], [560, 630]);
    expectWithin(max[1], [350, 400]);
    expectWithin(max[2] - min[2], [350, 420]);
  });

  test("the electric scientist has a spark at each hand, in front of him", () => {
    const sparks = partsNamed("electric_scientist", "spark");
    expect(sparks.length).toBe(2);
    expect(sparks.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("the badger's tail is behind its middle", () => {
    const tails = partsNamed("badger", "tail");
    expect(tails.length).toBeGreaterThan(0);
    expect(tails.every((part) => part.at[2] < 0)).toBe(true);
  });

  test("the spider hangs on a thread as high as the game's waits to drop", () => {
    // SpDsV's first frame: its bottom about 1613 up, and it's as wide as a walking spider
    const { min, max } = shapeBounds(ENEMY_SHAPES.spider);
    expect(min[1]).toBeCloseTo(1613, -1);
    expect(max[1]).toBeGreaterThan(1613 + 356);
    expect(max[0] - min[0]).toBeGreaterThan(850);
    expect(partsNamed("spider", "thread").length).toBeGreaterThan(0);
  });

  test("the river plants differ only in their leaves' colour", () => {
    // one shape with the same red jaws, their leaves blue or green
    const [blue, green] = [ENEMY_SHAPES.blue_river_plant, ENEMY_SHAPES.green_river_plant];
    expect(green.map(({ colour, ...shape }) => shape)).toEqual(blue.map(({ colour, ...shape }) => shape));
    const colours = (parts: typeof blue, name: string) => new Set(parts.filter((part) => part.name === name).map((part) => part.colour));
    expect(colours(green, "jaw")).toEqual(colours(blue, "jaw"));
    expect(colours(blue, "leaf").size).toBeGreaterThan(0);
    expect([...colours(blue, "leaf")].some((colour) => colours(green, "leaf").has(colour))).toBe(false);
  });

  test("a river plant is three petals a third of a turn apart round a bud", () => {
    // toothed petals, one behind and two towards the player, the bud in its middle
    const angleOf = ({ at: [x, , z] }: { at: number[] }) => Math.round((Math.atan2(x, z) * 180) / Math.PI);
    const parts = ENEMY_SHAPES.blue_river_plant;
    const petals = parts.filter((part) => part.name === "jaw");
    expect(petals.map(angleOf).map((angle) => (angle + 360) % 360).sort((first, second) => first - second)).toEqual([60, 180, 300]);
    const buds = parts.filter((part) => part.name === "bud");
    expect(buds.length).toBe(1);
    expect(Math.hypot(buds[0].at[0], buds[0].at[2])).toBeLessThan(1);
  });

  test("each river plant petal rises away from the plant's middle", () => {
    // its highest point is further out than its middle
    const petals = ENEMY_SHAPES.blue_river_plant.filter((part) => part.name === "jaw");
    petals.forEach((petal) => {
      const positions = partGeometry(petal).getAttribute("position");
      let highest = 0;
      for (let index = 1; index < positions.count; index++) {
        if (positions.getY(index) > positions.getY(highest)) {
          highest = index;
        }
      }
      const outAt = (x: number, z: number) => Math.hypot(x, z);
      expect(outAt(positions.getX(highest), positions.getZ(highest))).toBeGreaterThan(outAt(petal.at[0], petal.at[2]));
    });
  });

  test("the lizards differ by colour", () => {
    // green and red
    const colours = (type: "lizard" | "red_lizard") => ENEMY_SHAPES[type].map(({ colour }) => colour);
    expect(colours("lizard")).not.toEqual(colours("red_lizard"));
  });
});
