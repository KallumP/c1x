import { describe, expect, test } from "vitest";
import { ENEMY_SHAPES, partGeometry, shapeBounds } from "../../src/enemyShapes";

describe("enemy shapes", () => {
  // the sizes of the game's models, in game units (jungle rollers' JuPcG, n. sanity beach's Cr19G)
  test("the plant stands on the floor, as big as the game's: about 830 across and 720 tall", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.plant);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(720, -1);
    expect(max[0] - min[0]).toBeGreaterThan(760);
    expect(max[0] - min[0]).toBeLessThan(900);
    expect(Math.abs(min[0] + max[0])).toBeLessThan(60); // about as far out each side
  });

  test("the crab stands on the floor, as big as the game's: about 980 across (sideways, along x) and 480 tall", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.crab);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(480, -1);
    expect(max[0] - min[0]).toBeGreaterThan(900);
    expect(max[0] - min[0]).toBeLessThan(1060);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("the turtle stands on the floor, as big as the game's (Tu19G): about 725 across, 370 tall and 1180 long", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.turtle);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(370, -1);
    expect(max[0] - min[0]).toBeGreaterThan(650);
    expect(max[0] - min[0]).toBeLessThan(800);
    expect(max[2] - min[2]).toBeGreaterThan(1080);
    expect(max[2] - min[2]).toBeLessThan(1280);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("the native stands on the floor, as big as the game's (Na1iV): about 477 across, 925 tall and 532 deep", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.native);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(925, -1);
    expect(max[0] - min[0]).toBeGreaterThan(420);
    expect(max[0] - min[0]).toBeLessThan(540);
    expect(max[2] - min[2]).toBeGreaterThan(470);
    expect(max[2] - min[2]).toBeLessThan(600);
  });

  test("the badger stands on the floor, as big as the game's (Pi10V): about 534 across, 345 tall and 1125 long", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.badger);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(345, -1);
    expect(max[0] - min[0]).toBeGreaterThan(470);
    expect(max[0] - min[0]).toBeLessThan(600);
    expect(max[2] - min[2]).toBeGreaterThan(1020);
    expect(max[2] - min[2]).toBeLessThan(1230);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("the badger faces +z too: its head is in front of its middle, its tail behind", () => {
    const named = (name: string) => ENEMY_SHAPES.badger.filter((part) => part.name === name);
    expect(named("head").length).toBeGreaterThan(0);
    expect(named("tail").length).toBeGreaterThan(0);
    expect(named("head").every((part) => part.at[2] > 0)).toBe(true);
    expect(named("tail").every((part) => part.at[2] < 0)).toBe(true);
  });

  test("the warthog stands on the floor, as big as the game's (WarHV): about 352 across, 490 tall and 1097 long", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.warthog);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(490, -1);
    expect(max[0] - min[0]).toBeGreaterThan(300);
    expect(max[0] - min[0]).toBeLessThan(420);
    expect(max[2] - min[2]).toBeGreaterThan(1000);
    expect(max[2] - min[2]).toBeLessThan(1200);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("the warthog faces +z too: its snout is in front of its middle", () => {
    const snouts = ENEMY_SHAPES.warthog.filter((part) => part.name === "snout");
    expect(snouts.length).toBeGreaterThan(0);
    expect(snouts.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("the walking spider stands on the floor, as big as the game's (Sp1sV): about 975 across, 356 tall and 947 long", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.walking_spider);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(356, -1);
    expect(max[0] - min[0]).toBeGreaterThan(850);
    expect(max[0] - min[0]).toBeLessThan(1100);
    expect(max[2] - min[2]).toBeGreaterThan(820);
    expect(max[2] - min[2]).toBeLessThan(1070);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("the spider hangs as high as the game's waits to drop (SpDsV's first frame, its bottom about 1613 up), on a thread going up", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.spider);
    expect(min[1]).toBeCloseTo(1613, -1);
    expect(max[1]).toBeGreaterThan(1613 + 356);
    expect(max[0] - min[0]).toBeGreaterThan(850);
    expect(ENEMY_SHAPES.spider.some((part) => part.name === "thread")).toBe(true);
  });

  test("both spiders face +z: their heads are in front of their middles", () => {
    for (const parts of [ENEMY_SHAPES.spider, ENEMY_SHAPES.walking_spider]) {
      const heads = parts.filter((part) => part.name === "head");
      expect(heads.length).toBeGreaterThan(0);
      expect(heads.every((part) => part.at[2] > 0)).toBe(true);
    }
  });

  test("the monkey stands on the floor, as big as the game's (Mo1fG): about 645 across, 782 tall and 691 deep", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.monkey);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(782, -1);
    expect(max[0] - min[0]).toBeGreaterThan(560);
    expect(max[0] - min[0]).toBeLessThan(730);
    expect(max[2] - min[2]).toBeGreaterThan(600);
    expect(max[2] - min[2]).toBeLessThan(780);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test.each(["blue_river_plant", "green_river_plant"] as const)("the %s stands on the floor, as wide and deep as the game's (RV1fV): about 1570 across and 1703 deep, its petals lower than the game's first frame rears its back one (602)", (enemy) => {
    const { min, max } = shapeBounds(ENEMY_SHAPES[enemy]);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeGreaterThan(300);
    expect(max[1]).toBeLessThan(500);
    expect(max[0] - min[0]).toBeGreaterThan(1400);
    expect(max[0] - min[0]).toBeLessThan(1750);
    expect(max[2] - min[2]).toBeGreaterThan(1500);
    expect(max[2] - min[2]).toBeLessThan(1900);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("the river plants are one shape with the same red jaws, their leaves blue or green", () => {
    const [blue, green] = [ENEMY_SHAPES.blue_river_plant, ENEMY_SHAPES.green_river_plant];
    expect(green.map(({ colour, ...shape }) => shape)).toEqual(blue.map(({ colour, ...shape }) => shape));
    const colours = (parts: typeof blue, name: string) => new Set(parts.filter((part) => part.name === name).map((part) => part.colour));
    expect(colours(green, "jaw")).toEqual(colours(blue, "jaw"));
    expect(colours(blue, "leaf").size).toBeGreaterThan(0);
    expect([...colours(blue, "leaf")].some((colour) => colours(green, "leaf").has(colour))).toBe(false);
  });

  test("a river plant is three toothed petals a third of a turn apart, one behind and two towards the player, round a bud in its middle", () => {
    const angleOf = ({ at: [x, , z] }: { at: number[] }) => Math.round((Math.atan2(x, z) * 180) / Math.PI);
    const parts = ENEMY_SHAPES.blue_river_plant;
    const petals = parts.filter((part) => part.name === "jaw");
    expect(petals.map(angleOf).map((angle) => (angle + 360) % 360).sort((first, second) => first - second)).toEqual([60, 180, 300]);
    const buds = parts.filter((part) => part.name === "bud");
    expect(buds.length).toBe(1);
    expect(Math.hypot(buds[0].at[0], buds[0].at[2])).toBeLessThan(1);
  });

  test("each river plant petal rises away from the plant's middle: its highest point is further out than its middle", () => {
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

  test("the fish is on the floor, as big as the game's (RF1fV): about 434 long, 581 tall and 431 across", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.fish);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(581, -1);
    expect(max[2] - min[2]).toBeGreaterThan(370);
    expect(max[2] - min[2]).toBeLessThan(500);
    expect(max[0] - min[0]).toBeGreaterThan(370);
    expect(max[0] - min[0]).toBeLessThan(500);
    expect(min[0] + max[0]).toBeCloseTo(0);
  });

  test("the bat is as big as the game's (Ba1sG): 567 tall, about 220 across and 300 long, its spot 361 above its lowest point, as the game's", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.bat);
    expect(min[1]).toBeCloseTo(-361);
    expect(max[1]).toBeCloseTo(206);
    expect(max[0] - min[0]).toBeGreaterThan(180);
    expect(max[0] - min[0]).toBeLessThan(270);
    expect(max[2] - min[2]).toBeGreaterThan(250);
    expect(max[2] - min[2]).toBeLessThan(350);
    expect(min[0] + max[0]).toBeCloseTo(0);
  });

  test("the bat faces +z too: its eyes are in front of its middle", () => {
    const eyes = ENEMY_SHAPES.bat.filter((part) => part.name === "eye");
    expect(eyes.length).toBeGreaterThan(0);
    expect(eyes.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("the fish faces +z too: its eyes are in front of its middle", () => {
    const eyes = ENEMY_SHAPES.fish.filter((part) => part.name === "eye");
    expect(eyes.length).toBeGreaterThan(0);
    expect(eyes.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("the monkey faces +z too: its face is in front of its middle", () => {
    const faces = ENEMY_SHAPES.monkey.filter((part) => part.name === "face");
    expect(faces.length).toBeGreaterThan(0);
    expect(faces.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("the native faces +z too: its shield is in front of its middle", () => {
    const shields = ENEMY_SHAPES.native.filter((part) => part.name === "shield");
    expect(shields.length).toBeGreaterThan(0);
    expect(shields.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("the turtle faces +z too: its head is in front of its middle", () => {
    const heads = ENEMY_SHAPES.turtle.filter((part) => part.name === "head");
    expect(heads.length).toBeGreaterThan(0);
    expect(heads.every((part) => part.at[2] > 0)).toBe(true);
  });

  test("both face +z: the plant's jaws and the crab's eyes are in front of their middles", () => {
    const frontOf = (parts: typeof ENEMY_SHAPES.crab, name: string) =>
      parts.filter((part) => part.name === name).every((part) => part.at[2] > 0);
    expect(frontOf(ENEMY_SHAPES.plant, "jaw")).toBe(true);
    expect(frontOf(ENEMY_SHAPES.crab, "eye")).toBe(true);
    expect(ENEMY_SHAPES.plant.some((part) => part.name === "jaw")).toBe(true);
    expect(ENEMY_SHAPES.crab.some((part) => part.name === "eye")).toBe(true);
  });
});
