import { describe, expect, test } from "vitest";
import { toolsCommand } from "../../scripts/toolsCli";

describe("the tools exe's commands", () => {
  test("build-level <level> builds a level", () => {
    expect(toolsCommand(["build-level", "1_tide_ruins"])).toEqual({ kind: "build-level", level: "1_tide_ruins" });
  });

  test("editor starts the level editor", () => {
    expect(toolsCommand(["editor"])).toEqual({ kind: "editor" });
  });

  test("anything else says how to use it", () => {
    [[], ["build-level"], ["build-level", "a", "b"], ["editor", "now"], ["play"]].forEach((args) =>
      expect(toolsCommand(args)).toEqual({ kind: "usage" }));
  });
});
