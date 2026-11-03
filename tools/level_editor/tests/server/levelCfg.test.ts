import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseLevelCfg, readLevelCfg, setLevelCfg, writeLevelCfg } from "../../server/levelCfg";

describe("parseLevelCfg", () => {
  test("reads turn and scale, skipping comments", () => {
    expect(parseLevelCfg("# facing the castle\nturn = 270\nscale = 2000\n")).toEqual({ turn: 270, scale: 2000 });
  });

  test("is the defaults for what isn't set", () => {
    expect(parseLevelCfg("")).toEqual({ turn: 0, scale: 400 });
    expect(parseLevelCfg("scale = 800\r\n")).toEqual({ turn: 0, scale: 800 });
  });

  test("reads a negative turn", () => {
    expect(parseLevelCfg("turn = -90\n").turn).toBe(-90);
  });
});

describe("setLevelCfg", () => {
  test("changes the turn and scale lines, keeping comments and the rest", () => {
    expect(setLevelCfg("# a note\nturn = 0\n\nscale = 400\n", { turn: 90, scale: 800 }))
      .toBe("# a note\nturn = 90\n\nscale = 800\n");
  });

  test("leaves commented ones alone, adding lines at the end", () => {
    expect(setLevelCfg("# turn = 90\n", { turn: 180, scale: 400 })).toBe("# turn = 90\nturn = 180\nscale = 400\n");
  });

  test("adds after a last line with no newline", () => {
    expect(setLevelCfg("turn = 0", { turn: 0, scale: 500 })).toBe("turn = 0\nscale = 500\n");
  });

  test("makes the text from nothing", () => {
    expect(setLevelCfg("", { turn: 270, scale: 400 })).toBe("turn = 270\nscale = 400\n");
  });

  test("keeps crlf line endings", () => {
    expect(setLevelCfg("# a\r\nturn = 0\r\n", { turn: 90, scale: 400 })).toBe("# a\r\nturn = 90\r\nscale = 400\r\n");
  });

  test("refuses a turn the build can't do", () => {
    expect(() => setLevelCfg("", { turn: 45, scale: 400 })).toThrow("turn has to be 0, 90, 180 or 270");
  });

  test("refuses a scale that isn't a positive whole number", () => {
    expect(() => setLevelCfg("", { turn: 0, scale: 0 })).toThrow("scale has to be a whole number above 0");
    expect(() => setLevelCfg("", { turn: 0, scale: 12.5 })).toThrow("scale has to be a whole number above 0");
  });
});

describe("a level's level.cfg", () => {
  let root: string;
  const level = (name: string, cfg?: string) => {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, `${name}.obj`), "");
    if (cfg !== undefined) {
      writeFileSync(join(root, name, "level.cfg"), cfg);
    }
  };
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "level_src-")); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  test("reads it, or the defaults without one", () => {
    level("big", "turn = 90\nscale = 2000\n");
    level("plain");
    expect(readLevelCfg(root, "big")).toEqual({ turn: 90, scale: 2000 });
    expect(readLevelCfg(root, "plain")).toEqual({ turn: 0, scale: 400 });
  });

  test("writes it, keeping its comments", () => {
    level("big", "# big\nturn = 90\nscale = 2000\n");
    writeLevelCfg(root, "big", { turn: 180, scale: 1000 });
    expect(readFileSync(join(root, "big", "level.cfg"), "utf8")).toBe("# big\nturn = 180\nscale = 1000\n");
  });

  test("makes one without one", () => {
    level("plain");
    writeLevelCfg(root, "plain", { turn: 0, scale: 600 });
    expect(readFileSync(join(root, "plain", "level.cfg"), "utf8")).toBe("turn = 0\nscale = 600\n");
  });

  test("won't read or write a level that isn't listed", () => {
    expect(() => readLevelCfg(root, "nope")).toThrow("no level source nope");
    expect(() => writeLevelCfg(root, "../x", { turn: 0, scale: 400 })).toThrow();
  });
});
