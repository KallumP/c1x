import { describe, expect, test, vi } from "vitest";
import { runTools, toolsCommand, type ToolsHandlers } from "../../scripts/tools";

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

  test("list-online-levels lists the top levels on mod.io", () => {
    expect(toolsCommand(["list-online-levels"])).toEqual({
      kind: "list-online-levels",
      name: "",
    });
  });

  test("list-online-levels <name> lists the levels with that in their name", () => {
    expect(toolsCommand(["list-online-levels", "tide", "ruins"])).toEqual({
      kind: "list-online-levels",
      name: "tide ruins",
    });
  });

  test("download-level <id> downloads a level from mod.io", () => {
    expect(toolsCommand(["download-level", "17302"])).toEqual({
      kind: "download-level",
      modId: 17302,
    });
  });

  test("download-release <version> installs that release", () => {
    expect(toolsCommand(["download-release", "1.5"])).toEqual({
      kind: "download-release",
      version: "1.5",
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
    [["download-release"]],
    [["play"]],
  ])("anything else says how to use it: %j", (args) => {
    expect(toolsCommand(args)).toEqual({ kind: "usage" });
  });
});

const EXIT_CODE = 7; // a stand-in handler's, to show runTools gives it back

// handlers that only note being called, none touching the network or the disk
function standInHandlers(): ToolsHandlers {
  return {
    buildLevel: vi.fn(() => true),
    editor: vi.fn(async () => true),
    checkUpdate: vi.fn(async () => EXIT_CODE),
    listOnlineLevels: vi.fn(async () => EXIT_CODE),
    downloadLevel: vi.fn(async () => EXIT_CODE),
    downloadRelease: vi.fn(async () => EXIT_CODE),
  };
}

describe("the launcher's commands reach their own handlers", () => {
  test("check-update", async () => {
    const handlers = standInHandlers();
    expect(await runTools(["check-update", "1.4"], handlers)).toBe(EXIT_CODE);
    expect(handlers.checkUpdate).toHaveBeenCalledWith("1.4");
  });

  test("list-online-levels", async () => {
    const handlers = standInHandlers();
    expect(await runTools(["list-online-levels", "tide"], handlers)).toBe(EXIT_CODE);
    expect(handlers.listOnlineLevels).toHaveBeenCalledWith("tide");
  });

  test("download-level", async () => {
    const handlers = standInHandlers();
    expect(await runTools(["download-level", "17302"], handlers)).toBe(EXIT_CODE);
    expect(handlers.downloadLevel).toHaveBeenCalledWith(17302);
  });

  test("download-release", async () => {
    const handlers = standInHandlers();
    expect(await runTools(["download-release", "1.5"], handlers)).toBe(EXIT_CODE);
    expect(handlers.downloadRelease).toHaveBeenCalledWith("1.5");
  });
});
