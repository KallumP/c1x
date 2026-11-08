import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseLevelCfg, readLevelCfg, setLevelCfg, writeLevelCfg } from "../../server/levelCfg";
import { DEFAULT_CAMERA } from "../../src/camera";
import { DEFAULT_SKY } from "../../src/sky";

describe("parseLevelCfg", () => {
  test("reads turn and scale, skipping comments", () => {
    expect(parseLevelCfg("# facing the castle\nturn = 270\nscale = 2000\n")).toEqual({ turn: 270, scale: 2000, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
  });

  test("is the defaults for what isn't set", () => {
    expect(parseLevelCfg("")).toEqual({ turn: 0, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
    expect(parseLevelCfg("scale = 800\r\n")).toEqual({ turn: 0, scale: 800, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
  });

  test("reads the sky, n. sanity beach's for what isn't set", () => {
    expect(parseLevelCfg("sky_top = 1, 2, 3\nsky_split = 50\n").sky).toEqual({ ...DEFAULT_SKY, top: [1, 2, 3], split: 50 });
    expect(parseLevelCfg("sky_bottom=0,0,0\r\n").sky).toEqual({ ...DEFAULT_SKY, bottom: [0, 0, 0] });
  });

  test("skips a sky it can't read", () => {
    expect(parseLevelCfg("sky_top = 1, 2\nsky_split = 999\n").sky).toEqual(DEFAULT_SKY);
  });

  test("reads the camera's distance and angle, the usual ones for what isn't set or can't be read", () => {
    expect(parseLevelCfg("camera_distance = 1.5\ncamera_angle = 60\n").camera).toEqual({ distance: 1.5, angle: 60 });
    expect(parseLevelCfg("camera_angle = 30\n").camera).toEqual({ ...DEFAULT_CAMERA, angle: 30 });
    expect(parseLevelCfg("camera_distance = 9\ncamera_angle = 5\n").camera).toEqual(DEFAULT_CAMERA);
  });

  test("reads a negative turn", () => {
    expect(parseLevelCfg("turn = -90\n").turn).toBe(-90);
  });
});

describe("setLevelCfg", () => {
  test("changes the turn and scale lines, keeping comments and the rest", () => {
    expect(setLevelCfg("# a note\nturn = 0\n\nscale = 400\n", { turn: 90, scale: 800, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA }))
      .toBe("# a note\nturn = 90\n\nscale = 800\n");
  });

  test("leaves commented ones alone, adding lines at the end", () => {
    expect(setLevelCfg("# turn = 90\n", { turn: 180, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toBe("# turn = 90\nturn = 180\nscale = 400\n");
  });

  test("adds after a last line with no newline", () => {
    expect(setLevelCfg("turn = 0", { turn: 0, scale: 500, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toBe("turn = 0\nscale = 500\n");
  });

  test("makes the text from nothing", () => {
    expect(setLevelCfg("", { turn: 270, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toBe("turn = 270\nscale = 400\n");
  });

  test("keeps crlf line endings", () => {
    expect(setLevelCfg("# a\r\nturn = 0\r\n", { turn: 90, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toBe("# a\r\nturn = 90\r\nscale = 400\r\n");
  });

  test("changes the sky's lines, and adds them for a sky that isn't the default", () => {
    const sky = { ...DEFAULT_SKY, top: [1, 2, 3] as [number, number, number], split: 100 };
    expect(setLevelCfg("turn = 0\nscale = 400\nsky_split = 20\n", { turn: 0, scale: 400, sky, camera: DEFAULT_CAMERA }))
      .toBe("turn = 0\nscale = 400\nsky_split = 100\nsky_top = 1, 2, 3\n");
  });

  test("leaves the default sky out", () => {
    expect(setLevelCfg("", { turn: 0, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toBe("turn = 0\nscale = 400\n");
  });

  test("refuses a sky the build can't take", () => {
    const badTop = { ...DEFAULT_SKY, top: [256, 0, 0] as [number, number, number] };
    expect(() => setLevelCfg("", { turn: 0, scale: 400, sky: badTop, camera: DEFAULT_CAMERA })).toThrow("sky_top has to be red, green, blue");
    expect(() => setLevelCfg("", { turn: 0, scale: 400, sky: { ...DEFAULT_SKY, split: 217 }, camera: DEFAULT_CAMERA })).toThrow("sky_split has to be 0 to 216");
  });

  test("writes a camera that isn't the usual one, and leaves the usual one out", () => {
    expect(setLevelCfg("", { turn: 0, scale: 400, sky: DEFAULT_SKY, camera: { distance: 1.5, angle: 60 } }))
      .toBe("turn = 0\nscale = 400\ncamera_distance = 1.5\ncamera_angle = 60\n");
    expect(setLevelCfg("camera_angle = 60\n", { turn: 0, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA }))
      .toBe("camera_angle = 42\nturn = 0\nscale = 400\n");
  });

  test("refuses a camera the build can't take", () => {
    expect(() => setLevelCfg("", { turn: 0, scale: 400, sky: DEFAULT_SKY, camera: { distance: 4, angle: 42 } })).toThrow("camera_distance has to be 0.5 to 3");
    expect(() => setLevelCfg("", { turn: 0, scale: 400, sky: DEFAULT_SKY, camera: { distance: 1, angle: 90 } })).toThrow("camera_angle has to be 10 to 80");
  });

  test("refuses a turn the build can't do", () => {
    expect(() => setLevelCfg("", { turn: 45, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toThrow("turn has to be 0, 90, 180 or 270");
  });

  test("refuses a scale that isn't a positive whole number", () => {
    expect(() => setLevelCfg("", { turn: 0, scale: 0, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toThrow("scale has to be a whole number above 0");
    expect(() => setLevelCfg("", { turn: 0, scale: 12.5, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toThrow("scale has to be a whole number above 0");
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
    expect(readLevelCfg(root, "big")).toEqual({ turn: 90, scale: 2000, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
    expect(readLevelCfg(root, "plain")).toEqual({ turn: 0, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
  });

  test("writes it, keeping its comments", () => {
    level("big", "# big\nturn = 90\nscale = 2000\n");
    writeLevelCfg(root, "big", { turn: 180, scale: 1000, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
    expect(readFileSync(join(root, "big", "level.cfg"), "utf8")).toBe("# big\nturn = 180\nscale = 1000\n");
  });

  test("makes one without one", () => {
    level("plain");
    writeLevelCfg(root, "plain", { turn: 0, scale: 600, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA });
    expect(readFileSync(join(root, "plain", "level.cfg"), "utf8")).toBe("turn = 0\nscale = 600\n");
  });

  test("won't read or write a level that isn't listed", () => {
    expect(() => readLevelCfg(root, "nope")).toThrow("no level source nope");
    expect(() => writeLevelCfg(root, "../x", { turn: 0, scale: 400, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA })).toThrow();
  });
});
