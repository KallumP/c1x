import { describe, expect, test } from "vitest";
import { buildWarnings, builtText } from "../../src/buildOutput";

describe("a build's output", () => {
  test("its warnings are its lines starting warning:, without that", () => {
    const output = "warning: object 2 (Basic box) is a duplicate of object 1, in the same spot\r\nwrote build/levels/x";
    expect(buildWarnings(output)).toEqual(["object 2 (Basic box) is a duplicate of object 1, in the same spot"]);
  });

  test("has no warnings when it only says what it wrote", () => {
    expect(buildWarnings("wrote build/levels/x")).toEqual([]);
  });

  test.each([
    [0, "Built x"],
    [1, "Built x, with 1 warning"],
    [2, "Built x, with 2 warnings"],
  ])("a build with %i warnings says so", (count, text) => {
    expect(builtText("x", Array(count).fill("a warning"))).toBe(text);
  });
});
