import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { mossyCreekMtl, mossyCreekObj, mossyCreekObjects, pythonFloat, pythonRound } from "../../../../level_src/mossy_creek/make_map";

const committed = (file: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../level_src/mossy_creek/${file}`, import.meta.url)), "utf8").replace(/\r\n/g, "\n");

describe("python's numbers, for the same files", () => {
  test("round(x, n) rounds the exact value, halves to even", () => {
    expect(pythonRound(0.03125, 4)).toBe(0.0312); // exactly a half: to even
    expect(pythonRound(0.03135, 4)).toBe(0.0314); // just over a half, as a double
    expect(pythonRound(2.675, 2)).toBe(2.67);
    expect(Object.is(pythonRound(-0.00001, 4), -0)).toBe(true);
  });

  test("floats are written as python's repr writes them", () => {
    expect([4, -0, 0.15, 1.23, -15.5].map(pythonFloat)).toEqual(["4.0", "-0.0", "0.15", "1.23", "-15.5"]);
  });
});

describe("mossy creek's generator", () => {
  test("makes the committed .mtl", () => {
    expect(mossyCreekMtl()).toBe(committed("mossy_creek.mtl"));
  });

  test("makes the objects.json the python version made", () => {
    // the committed one has since had its boxes moved in the level editor, which writes it its own way
    const madeByPython = readFileSync(fileURLToPath(new URL("mossyCreekObjects.json", import.meta.url)), "utf8").replace(/\r\n/g, "\n");
    expect(mossyCreekObjects()).toBe(madeByPython);
  });

  test("makes the committed .obj", () => {
    expect(mossyCreekObj().text).toBe(committed("mossy_creek.obj"));
  }, 120000);
});
