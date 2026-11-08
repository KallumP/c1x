import { describe, expect, test } from "vitest";
import { ENEMY_SHAPES, shapeBounds } from "../../src/enemyShapes";

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
