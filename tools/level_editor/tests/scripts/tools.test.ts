import { describe, expect, test } from "vitest";
import { toolsCommand } from "../../scripts/tools";

describe("the tools exe's commands", () => {
  test("build-level <level> builds a level", () => {
    expect(toolsCommand(["build-level", "1_tide_ruins"])).toEqual({ kind: "build-level", level: "1_tide_ruins" });
  });

  test("editor starts the level editor", () => {
    expect(toolsCommand(["editor"])).toEqual({ kind: "editor" });
  });

  test("check-update <version> looks for a newer release", () => {
    expect(toolsCommand(["check-update", "1.4"])).toEqual({ kind: "check-update", version: "1.4" });
  });

  test("list-online-levels lists the levels on mod.io", () => {
    expect(toolsCommand(["list-online-levels"])).toEqual({ kind: "list-online-levels" });
  });

  test("download-level <id> downloads a level from mod.io", () => {
    expect(toolsCommand(["download-level", "17302"])).toEqual({
      kind: "download-level",
      modId: 17302,
    });
  });

  const NOT_IDS = ["", "abc", "1.5", "-3", "0"];

  test.each(NOT_IDS)("download-level needs a mod's id: %j", (id) => {
    expect(toolsCommand(["download-level", id])).toEqual({ kind: "usage" });
  });

  test.each([
    [[]],
    [["build-level"]],
    [["build-level", "a", "b"]],
    [["editor", "now"]],
    [["check-update"]],
    [["check-update", "1.4", "1.5"]],
    [["list-online-levels", "now"]],
    [["play"]],
  ])("anything else says how to use it: %j", (args) => {
    expect(toolsCommand(args)).toEqual({ kind: "usage" });
  });
});
