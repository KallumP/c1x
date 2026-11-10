import { expect, test } from "vitest";
import { boxUvs } from "../../../src/three/boxUvs";

test("a floor triangle takes its uvs from x and z, one texture a metre", () => {
  const floor = [0, 0, 0, 1, 0, 0, 0, 0, 1];
  expect(Array.from(boxUvs(floor))).toEqual([0, 0, 1, 0, 0, 1]);
});

test("a wall facing x takes them from z and y", () => {
  const wall = [2, 0, 0, 2, 0, 1, 2, 1, 0];
  expect(Array.from(boxUvs(wall))).toEqual([0, 0, 1, 0, 0, 1]);
});

test("a wall facing z takes them from x and y", () => {
  const wall = [0, 0, 3, 1, 0, 3, 0, 1, 3];
  expect(Array.from(boxUvs(wall))).toEqual([0, 0, 1, 0, 0, 1]);
});

test("each triangle is projected on its own", () => {
  const two = [0, 0, 0, 1, 0, 0, 0, 0, 1, /* then a wall */ 2, 0, 0, 2, 0, 1, 2, 1, 0];
  expect(Array.from(boxUvs(two))).toEqual([0, 0, 1, 0, 0, 1, /* the wall's, as alone */ 0, 0, 1, 0, 0, 1]);
});
