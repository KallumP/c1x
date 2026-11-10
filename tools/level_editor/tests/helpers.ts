// helpers shared by the editor's and the level build's tests
import { expect } from "vitest";
import type { EnemyType, LevelObject } from "../src/objects";

type Vector = readonly number[];

// each of a vector's values is close to the wanted one (to toBeCloseTo's default digits)
export function expectCloseTo(vector: Vector, wanted: Vector): void {
  expect(vector.length).toBe(wanted.length);
  wanted.forEach((value, axis) => expect(vector[axis]).toBeCloseTo(value));
}

// each of a point's values is within tolerance of the wanted one
export function expectNear(point: Vector, wanted: Vector, tolerance: number): void {
  expect(point.length).toBe(wanted.length);
  wanted.forEach((value, axis) => expect(Math.abs(point[axis] - value)).toBeLessThanOrEqual(tolerance));
}

// values rounded to a thousandth, with -0 made 0 (toEqual tells them apart)
export const noMinusZero = (values: Vector): number[] => values.map((value) => Math.round(value * 1000) / 1000 + 0);

// an enemy of a type, standing at the origin unless more says otherwise
export const enemyObject = (type: EnemyType, more: Partial<LevelObject> = {}): LevelObject =>
  ({ kind: "enemy", enemy: type, at: [0, 0, 0], raise: 0, stack: 1, ...more });
